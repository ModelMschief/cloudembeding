import { pipeline, env } from '@xenova/transformers';
import path from 'path';

// Set up local caching directory (Use HOME on Azure for persistence across container restarts, fallback to cwd locally)
const homeDir = process.env.HOME || process.cwd();
env.cacheDir = path.resolve(homeDir, '.cache');

let embedder = null;

/**
 * Initializes the model once at startup.
 */
export async function initializeModel() {
  if (!embedder) {
    console.log('Loading Multilingual-E5-base ONNX model...');
    try {
      embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base', {
        quantized: true,
      });
      console.log('Model loaded successfully.');
    } catch (err) {
      console.error('Failed to load model:', err);
      throw err;
    }
  }
}

/**
 * Returns true if the model has been loaded successfully.
 */
export function isModelLoaded() {
  return embedder !== null;
}

/**
 * Generates embeddings for a batch of texts.
 * 
 * @param {string[]} texts - Array of texts to embed.
 * @param {string} type - "query" or "passage" (default).
 * @returns {Promise<number[][]>} - 2D array of embeddings.
 */
export async function generateEmbeddings(texts, type = 'passage') {
  if (!embedder) {
    throw new Error('Model is not initialized.');
  }

  // Prepend prefix for E5 model correctly
  const prefix = type === 'query' ? 'query: ' : 'passage: ';
  const prefixedTexts = texts.map(text => `${prefix}${text}`);

  // Run the model with mean pooling and normalization
  const output = await embedder(prefixedTexts, {
    pooling: 'mean',
    normalize: true,
  });

  // output is a Tensor, output.tolist() converts it to a standard JS 2D array
  return output.tolist();
}
