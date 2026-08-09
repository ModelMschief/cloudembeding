import { Worker } from 'worker_threads';
import path from 'path';

let worker = null;
let modelReady = false;

// Keeps track of pending requests
const pendingRequests = new Map();
let messageIdCounter = 0;

/**
 * Initializes the model once at startup via a worker thread.
 */
export async function initializeModel() {
  if (!worker) {
    console.log('Spawning worker thread for AI model initialization...');
    
    // Resolve path to the worker.js script
    const workerPath = path.resolve(process.cwd(), 'worker.js');
    
    worker = new Worker(workerPath);
    
    worker.on('message', (message) => {
      if (message.type === 'ready') {
        console.log('Worker model is ready.');
        modelReady = true;
      } else if (message.type === 'error') {
        console.error('Worker error:', message.error);
      } else if (message.type === 'result') {
        const { id, embedding, error } = message;
        if (pendingRequests.has(id)) {
          const { resolve, reject } = pendingRequests.get(id);
          pendingRequests.delete(id);
          if (error) {
            reject(new Error(error));
          } else {
            resolve(embedding);
          }
        }
      }
    });
    
    worker.on('error', (err) => {
      console.error('Worker thread crashed:', err);
      modelReady = false;
      worker = null;
    });
    
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
      modelReady = false;
      worker = null;
    });
  }
}

/**
 * Returns true if the model has been loaded successfully.
 */
export function isModelLoaded() {
  return modelReady;
}

/**
 * Generates embeddings for a batch of texts.
 * 
 * @param {string[]} texts - Array of texts to embed.
 * @param {string} type - "query" or "passage" (default).
 * @returns {Promise<number[][]>} - 2D array of embeddings.
 */
export async function generateEmbeddings(texts, type = 'passage') {
  if (!modelReady || !worker) {
    throw new Error('Model is not initialized.');
  }

  // Prepend prefix for E5 model correctly
  const prefix = type === 'query' ? 'query: ' : 'passage: ';
  const prefixedTexts = texts.map(text => `${prefix}${text}`);
  
  const id = messageIdCounter++;
  
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ type: 'embed', id, text: prefixedTexts });
  });
}
