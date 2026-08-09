import { pipeline, env } from '@xenova/transformers';
import path from 'path';

// Set up local caching directory
env.cacheDir = path.resolve(process.cwd(), '.cache');

async function downloadModel() {
  console.log('Downloading model Xenova/multilingual-e5-small...');
  try {
    // We only instantiate the pipeline to force downloading/caching the model.
    // It will be cached in .cache/models/Xenova/multilingual-e5-small
    await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      quantized: true,
    });
    console.log('Model downloaded and cached successfully.');
  } catch (error) {
    console.error('Failed to download the model:', error);
    process.exit(1);
  }
}

downloadModel();
