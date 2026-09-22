/**
 * In-Browser Feature Extraction & Embedding Web Worker
 * 
 * Runs Xenova/all-MiniLM-L6-v2 via Transformers.js off the main thread.
 * Generates 384-dimensional dense vector embeddings with mean pooling
 * and L2 normalization for cosine similarity search.
 * Hardware-accelerated with WebGPU and automatic WASM fallback.
 */

// @ts-nocheck
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = true;
env.useBrowserCache = true;

let extractor: any = null;
let isLoading = false;

/**
 * Initialize the feature extraction pipeline
 */
async function loadModel(device: 'webgpu' | 'wasm' = 'wasm') {
  if (extractor || isLoading) return;
  isLoading = true;

  try {
    self.postMessage({ type: 'loading', progress: 0 });

    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        device,
        dtype: device === 'webgpu' ? 'fp32' : 'q8',
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && typeof progress.progress === 'number') {
            self.postMessage({ type: 'loading', progress: Math.round(progress.progress) });
          }
        },
      }
    );

    self.postMessage({ type: 'ready', device });
  } catch (err: any) {
    if (device === 'webgpu') {
      console.warn('[EmbeddingWorker] WebGPU unavailable for embeddings, falling back to WASM:', err.message);
      isLoading = false;
      extractor = null;
      return loadModel('wasm');
    }
    self.postMessage({ type: 'error', message: `Embedding model load failed: ${err.message}` });
  } finally {
    isLoading = false;
  }
}

/**
 * Compute normalized embedding for an array of texts
 */
async function embedTexts(texts: string[], requestId?: string) {
  if (!extractor) {
    self.postMessage({ type: 'error', message: 'Model not loaded. Send { type: "load" } first.', requestId });
    return;
  }

  const startTime = performance.now();

  try {
    const embeddings: number[][] = [];

    // Process in batches of 4 for optimal browser memory and responsiveness
    const batchSize = 4;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      for (const text of batch) {
        // Clean text input
        const clean = text.replace(/\s+/g, ' ').trim();
        if (!clean) {
          embeddings.push(new Array(384).fill(0));
          continue;
        }

        const output = await extractor(clean, {
          pooling: 'mean',
          normalize: true,
        });

        // Convert Float32Array to standard array
        const vector = Array.from(output.data as Float32Array);
        embeddings.push(vector);
      }

      // Report batch progress for large documents
      const progressPercent = Math.min(100, Math.round(((i + batch.length) / texts.length) * 100));
      self.postMessage({ 
        type: 'batch_progress', 
        completed: Math.min(texts.length, i + batch.length), 
        total: texts.length, 
        progress: progressPercent,
        requestId 
      });
    }

    const duration = Math.round(performance.now() - startTime);

    self.postMessage({
      type: 'result',
      embeddings,
      duration,
      count: embeddings.length,
      requestId,
    });
  } catch (err: any) {
    self.postMessage({ type: 'error', message: `Embedding computation failed: ${err.message}`, requestId });
  }
}

/**
 * Message handler
 */
self.addEventListener('message', async (event: MessageEvent) => {
  const { type, text, texts, device, requestId } = event.data;

  switch (type) {
    case 'load':
      await loadModel(device || 'wasm');
      break;

    case 'embed':
      await embedTexts([text], requestId);
      break;

    case 'embed_batch':
      await embedTexts(texts || [], requestId);
      break;

    case 'status':
      self.postMessage({
        type: 'status',
        loaded: !!extractor,
        loading: isLoading,
      });
      break;

    default:
      self.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
  }
});
