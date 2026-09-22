/**
 * useVoiceCommand — React hook orchestrating the full voice-to-UI pipeline
 * 
 * Manages: Web Worker lifecycle → Voice capture → VAD → Whisper transcription → Intent routing
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useIndraStore } from '@/store/indra-store';
import { VoiceCapture } from '@/lib/voice/voice-capture';
import { routeIntent, type IntentMatch } from '@/lib/voice/intent-router';

export interface VoiceCommandState {
  /** Whether the microphone is actively listening */
  isListening: boolean;
  /** Whether the Whisper model is loaded and ready */
  isModelLoaded: boolean;
  /** Model download/load progress (0–100) */
  modelLoadProgress: number;
  /** Whether the model is currently loading */
  isModelLoading: boolean;
  /** Whether Whisper is currently processing audio */
  isProcessing: boolean;
  /** Most recent transcription text */
  lastTranscript: string;
  /** Most recent matched intent */
  lastIntent: IntentMatch | null;
  /** Current mic RMS audio level (0–1) for visualizer */
  audioLevel: number;
  /** Start/stop microphone listening */
  toggleListening: () => void;
  /** Pre-load the Whisper model */
  loadModel: () => void;
  /** Any error message */
  error: string | null;
  /** Dismiss the last transcript overlay */
  dismissTranscript: () => void;
}

export function useVoiceCommand(): VoiceCommandState {
  const router = useRouter();

  const [isListening, setIsListening] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastIntent, setLastIntent] = useState<IntentMatch | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const captureRef = useRef<VoiceCapture | null>(null);
  const audioLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Initialize the Web Worker
   */
  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL('../workers/whisper-worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent) => {
      const { type, text, duration, progress, message, loaded } = event.data;

      switch (type) {
        case 'ready':
          setIsModelLoaded(true);
          setIsModelLoading(false);
          setModelLoadProgress(100);
          break;
        case 'loading':
          setIsModelLoading(true);
          setModelLoadProgress(progress);
          break;
        case 'result':
          setIsProcessing(false);
          handleTranscriptionResult(text, duration);
          break;
        case 'error':
          setIsProcessing(false);
          setIsModelLoading(false);
          setError(message);
          // Auto-clear error after 5 seconds
          setTimeout(() => setError(null), 5000);
          break;
        case 'status':
          setIsModelLoaded(loaded);
          break;
      }
    };

    worker.onerror = (err) => {
      setError(`Worker error: ${err.message}`);
      setIsProcessing(false);
    };

    workerRef.current = worker;
    return worker;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle a transcription result from Whisper
   */
  const handleTranscriptionResult = useCallback((text: string, duration: number) => {
    if (!text || text.trim().length < 2) return;

    setLastTranscript(text);

    // Route through intent engine
    const store = useIndraStore.getState();
    const match = routeIntent(text, router, store);

    if (match) {
      setLastIntent(match);
      // Execute the matched action
      match.action();

      // Show toast notification
      store.addToast({
        title: `🎙️ Voice Command: ${match.label}`,
        message: `"${text}" (${Math.round(match.confidence * 100)}% confidence, ${duration}ms)`,
        type: 'success',
      });
    } else {
      setLastIntent(null);

      store.addToast({
        title: '🎙️ Voice: No Match',
        message: `"${text}" — didn't match any command. Try "open audit" or "toggle sidebar".`,
        type: 'info',
      });
    }

    // Auto-dismiss transcript after 4 seconds
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setLastTranscript('');
      setLastIntent(null);
    }, 4000);
  }, [router]);

  /**
   * Load the Whisper model
   */
  const loadModel = useCallback(() => {
    if (isModelLoaded || isModelLoading) return;

    const worker = initWorker();

    // Detect WebGPU support
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    worker.postMessage({ type: 'load', device: hasWebGPU ? 'webgpu' : 'wasm' });
    setIsModelLoading(true);
    setError(null);
  }, [isModelLoaded, isModelLoading, initWorker]);

  /**
   * Toggle microphone listening
   */
  const toggleListening = useCallback(async () => {
    if (isListening) {
      // Stop listening
      captureRef.current?.stopCapture();
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      setIsListening(false);
      setAudioLevel(0);
      return;
    }

    // Start listening — load model first if needed
    if (!isModelLoaded) {
      loadModel();
      // We'll wait for model to load, then user clicks again
      return;
    }

    try {
      setError(null);

      if (!captureRef.current) {
        captureRef.current = new VoiceCapture({
          energyThreshold: 0.01,
          minSpeechDuration: 300,
          silenceTimeout: 1000,
          maxSegmentDuration: 15,
        });
      }

      captureRef.current.onSpeechSegment((audio: Float32Array) => {
        if (workerRef.current) {
          setIsProcessing(true);
          workerRef.current.postMessage(
            { type: 'transcribe', audio },
            [audio.buffer] // Transfer buffer for zero-copy
          );
        }
      });

      await captureRef.current.startCapture();
      setIsListening(true);

      // Poll audio level for visualizer
      audioLevelIntervalRef.current = setInterval(() => {
        if (captureRef.current) {
          setAudioLevel(captureRef.current.getAudioLevel());
        }
      }, 50);
    } catch (err: any) {
      setError(err.message);
      setIsListening(false);
    }
  }, [isListening, isModelLoaded, loadModel]);

  /**
   * Dismiss the transcript overlay manually
   */
  const dismissTranscript = useCallback(() => {
    setLastTranscript('');
    setLastIntent(null);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      captureRef.current?.stopCapture();
      workerRef.current?.terminate();
      if (audioLevelIntervalRef.current) clearInterval(audioLevelIntervalRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return {
    isListening,
    isModelLoaded,
    modelLoadProgress,
    isModelLoading,
    isProcessing,
    lastTranscript,
    lastIntent,
    audioLevel,
    toggleListening,
    loadModel,
    error,
    dismissTranscript,
  };
}
