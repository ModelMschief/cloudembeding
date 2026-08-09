import Fastify from 'fastify';
import dotenv from 'dotenv';
import { initializeModel, isModelLoaded, generateEmbeddings } from './embedding.js';

dotenv.config();

const app = Fastify({
  logger: false, // Avoid logging user text or embeddings automatically
  bodyLimit: 5 * 1024 * 1024, // 5MB request size limit to prevent memory spikes
});

const API_KEY = process.env.EMBEDDING_API_KEY;

if (!API_KEY) {
  console.warn('WARNING: EMBEDDING_API_KEY is not set in environment variables! Auth will always fail unless set.');
}

// Authentication middleware
app.addHook('preHandler', async (request, reply) => {
  // Bypass authentication for health check
  if (request.url === '/health' || request.url === '/') {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== API_KEY) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    model_loaded: isModelLoaded()
  };
});

// Embed endpoint
app.post('/embed', async (request, reply) => {
  const { texts, type = 'passage' } = request.body || {};

  // Validate input
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return reply.status(400).send({ error: 'Bad Request: "texts" must be a non-empty array of strings.' });
  }

  // Ensure all texts are strings and not empty
  if (!texts.every(t => typeof t === 'string' && t.trim().length > 0)) {
    return reply.status(400).send({ error: 'Bad Request: All elements in "texts" must be non-empty strings.' });
  }

  if (type !== 'query' && type !== 'passage') {
    return reply.status(400).send({ error: 'Bad Request: "type" must be either "query" or "passage".' });
  }

  try {
    const embeddings = await generateEmbeddings(texts, type);
    
    // Ensure we have generated output
    if (!embeddings || embeddings.length === 0) {
       return reply.status(500).send({ error: 'Failed to generate embeddings.' });
    }

    const dimensions = embeddings[0].length;

    return {
      embeddings,
      dimensions
    };
  } catch (err) {
    // We only log the error message, not the user text
    console.error('Error during inference:', err.message);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
});

// Default route
app.get('/', async (request, reply) => {
  return reply.redirect('/health');
});

// Graceful startup
const start = async () => {
  try {
    // 1. Load the model before accepting connections
    await initializeModel();
    
    // 2. Start the Fastify server
    const port = process.env.PORT || 8080;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening at http://localhost:${port}`);
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
};

start();
