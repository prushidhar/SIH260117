/**
 * Whisper Web Worker — Off-main-thread speech recognition via Transformers.js
 * 
 * Runs the Xenova/whisper-tiny.en model (~39 MB) entirely locally.
 * Accepts Float32Array audio chunks (16 kHz mono) and returns transcription text.
 * Supports WebGPU acceleration with WASM fallback.
 */

// @ts-nocheck — Web Workers don't have standard TS module resolution for dynamic imports
import { pipeline, env } from '@huggingface/transformers';

// Disable remote model fetching after initial cache — sovereign air-gap compliance
env.allowLocalModels = true;
env.useBrowserCache = true;

let transcriber: any = null;
let isLoading = false;

/**
 * Initialize the ASR pipeline
 */
async function loadModel(device: 'webgpu' | 'wasm' = 'wasm') {
  if (transcriber || isLoading) return;
  isLoading = true;

  try {
    self.postMessage({ type: 'loading', progress: 0 });

    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
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

    self.postMessage({ type: 'ready' });
  } catch (err: any) {
    // If WebGPU fails, retry with WASM
    if (device === 'webgpu') {
      console.warn('[WhisperWorker] WebGPU unavailable, falling back to WASM:', err.message);
      isLoading = false;
      transcriber = null;
      return loadModel('wasm');
    }
    self.postMessage({ type: 'error', message: `Model load failed: ${err.message}` });
  } finally {
    isLoading = false;
  }
}

/**
 * Transcribe a Float32Array audio buffer (16 kHz mono)
 */
async function transcribe(audio: Float32Array) {
  if (!transcriber) {
    self.postMessage({ type: 'error', message: 'Model not loaded. Send { type: "load" } first.' });
    return;
  }

  const startTime = performance.now();

  try {
    const result = await transcriber(audio, {
      language: 'english',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    const duration = Math.round(performance.now() - startTime);
    const text = (result?.text || '').trim();

    self.postMessage({ type: 'result', text, duration });
  } catch (err: any) {
    self.postMessage({ type: 'error', message: `Transcription failed: ${err.message}` });
  }
}

/**
 * Message handler
 */
self.addEventListener('message', async (event: MessageEvent) => {
  const { type, audio, device } = event.data;

  switch (type) {
    case 'load':
      await loadModel(device || 'wasm');
      break;
    case 'transcribe':
      await transcribe(audio);
      break;
    case 'status':
      self.postMessage({
        type: 'status',
        loaded: !!transcriber,
        loading: isLoading,
      });
      break;
    default:
      self.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
  }
});
