import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { parentPort } from 'worker_threads';

// Configure the cache directory for Azure persistent storage
env.cacheDir = process.env.HOME ? path.resolve(process.env.HOME, '.cache') : path.resolve(process.cwd(), '.cache');

let embedder = null;
let isReady = false;

// Initialize the model in the worker thread
async function initializeModel() {
  try {
    console.log('[Worker] Loading Multilingual-E5-small ONNX model...');
    embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      quantized: true,
    });
    console.log('[Worker] Model loaded successfully.');
    isReady = true;
    parentPort.postMessage({ type: 'ready' });
  } catch (error) {
    console.error('[Worker] Failed to load model:', error);
    parentPort.postMessage({ type: 'error', error: error.message });
  }
}

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  if (message.type === 'embed') {
    const { id, text } = message;
    if (!isReady) {
      parentPort.postMessage({ type: 'result', id, error: 'Model not ready yet.' });
      return;
    }

    try {
      // Execute inference
      const result = await embedder(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(result.data);
      parentPort.postMessage({ type: 'result', id, embedding });
    } catch (error) {
      console.error('[Worker] Inference error:', error);
      parentPort.postMessage({ type: 'result', id, error: error.message });
    }
  }
});

// Start initialization immediately
initializeModel();
