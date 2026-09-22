/**
 * useLocalRAG — React Hook orchestrating In-Browser Vector Ingestion & Querying
 * 
 * Manages: Embedding Web Worker lifecycle, document chunking,
 * client-side vector embedding, and zero-latency cosine similarity search.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { extractTextFromFile, chunkDocument } from '@/lib/rag/document-chunker';
import { 
  indexLocalDocument, 
  searchLocalVectorStore, 
  listLocalKBDocuments, 
  deleteLocalKBDocument,
  getVectorStoreStats,
  type VectorSearchResult,
  type VectorStoreStats,
} from '@/lib/rag/vector-store';
import type { DBKBDocument } from '@/lib/db/indra-db';
import { useIndraStore } from '@/store/indra-store';

export interface IngestionProgress {
  filename: string;
  stage: 'extracting' | 'chunking' | 'embedding' | 'storing' | 'done' | 'error';
  progressPercent: number;
  chunkCount: number;
  completedChunks: number;
  message: string;
}

export function useLocalRAG() {
  const { addToast } = useIndraStore();

  const workerRef = useRef<Worker | null>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('wasm');
  const [ingestion, setIngestion] = useState<IngestionProgress | null>(null);
  const [localDocs, setLocalDocs] = useState<DBKBDocument[]>([]);
  const [stats, setStats] = useState<VectorStoreStats | null>(null);
  const [lastSearchLatency, setLastSearchLatency] = useState<number | null>(null);

  // Pending embedding requests map (requestId -> { resolve, reject })
  const pendingRequestsRef = useRef<Map<string, { resolve: (val: number[][]) => void; reject: (err: any) => void }>>(new Map());

  /**
   * Initialize Embedding Web Worker
   */
  const initWorker = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL('../workers/embedding-worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent) => {
      const { type, progress, device: dev, embeddings, requestId, completed, total, message } = event.data;

      switch (type) {
        case 'ready':
          setIsModelLoaded(true);
          setIsModelLoading(false);
          setModelProgress(100);
          if (dev) setDevice(dev);
          break;

        case 'loading':
          setIsModelLoading(true);
          setModelProgress(progress);
          break;

        case 'batch_progress':
          setIngestion((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              completedChunks: completed,
              progressPercent: progress,
              message: `Embedding vectors ${completed}/${total} (${device.toUpperCase()})...`,
            };
          });
          break;

        case 'result': {
          if (requestId && pendingRequestsRef.current.has(requestId)) {
            const { resolve } = pendingRequestsRef.current.get(requestId)!;
            pendingRequestsRef.current.delete(requestId);
            resolve(embeddings);
          }
          break;
        }

        case 'error': {
          if (requestId && pendingRequestsRef.current.has(requestId)) {
            const { reject } = pendingRequestsRef.current.get(requestId)!;
            pendingRequestsRef.current.delete(requestId);
            reject(new Error(message));
          }
          setIsModelLoading(false);
          break;
        }
      }
    };

    workerRef.current = worker;
    return worker;
  }, [device]);

  /**
   * Pre-load the embedding model
   */
  const loadModel = useCallback(() => {
    if (isModelLoaded || isModelLoading) return;
    const worker = initWorker();
    if (!worker) return;

    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    worker.postMessage({ type: 'load', device: hasWebGPU ? 'webgpu' : 'wasm' });
    setIsModelLoading(true);
  }, [isModelLoaded, isModelLoading, initWorker]);

  /**
   * Send texts to worker for vector embedding
   */
  const computeEmbeddings = useCallback((texts: string[]): Promise<number[][]> => {
    return new Promise((resolve, reject) => {
      const worker = initWorker();
      if (!worker) return reject(new Error('Worker not initialized'));

      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      pendingRequestsRef.current.set(requestId, { resolve, reject });

      // Automatically trigger load if not ready
      if (!isModelLoaded && !isModelLoading) {
        loadModel();
      }

      worker.postMessage({
        type: 'embed_batch',
        texts,
        requestId,
      });
    });
  }, [initWorker, isModelLoaded, isModelLoading, loadModel]);

  /**
   * Refresh local document index & statistics
   */
  const refreshLocalData = useCallback(async () => {
    try {
      const [docs, currentStats] = await Promise.all([
        listLocalKBDocuments(),
        getVectorStoreStats(),
      ]);
      setLocalDocs(docs);
      setStats(currentStats);
    } catch (err) {
      console.warn('[useLocalRAG] Error loading local documents:', err);
    }
  }, []);

  useEffect(() => {
    refreshLocalData();
  }, [refreshLocalData]);

  /**
   * Ingest a file completely in the browser: extract -> chunk -> embed -> store
   */
  const ingestFileLocally = useCallback(async (file: File): Promise<DBKBDocument | null> => {
    const startTime = performance.now();

    try {
      // 1. Extraction
      setIngestion({
        filename: file.name,
        stage: 'extracting',
        progressPercent: 10,
        chunkCount: 0,
        completedChunks: 0,
        message: 'Extracting client-side document streams...',
      });

      const text = await extractTextFromFile(file);

      // 2. Chunking
      setIngestion({
        filename: file.name,
        stage: 'chunking',
        progressPercent: 30,
        chunkCount: 0,
        completedChunks: 0,
        message: 'Partitioning text into overlapping semantic chunks...',
      });

      const chunks = chunkDocument(text, { maxChunkSize: 450, overlap: 50 });
      if (chunks.length === 0) {
        throw new Error('Document produced 0 text chunks. File may be empty or unreadable.');
      }

      // 3. Vector Embedding
      setIngestion({
        filename: file.name,
        stage: 'embedding',
        progressPercent: 40,
        chunkCount: chunks.length,
        completedChunks: 0,
        message: `Computing ${chunks.length} dense vectors via all-MiniLM-L6-v2 (${device.toUpperCase()})...`,
      });

      const chunkTexts = chunks.map((c) => c.content);
      const embeddings = await computeEmbeddings(chunkTexts);

      // 4. Storing in IndexedDB
      setIngestion({
        filename: file.name,
        stage: 'storing',
        progressPercent: 90,
        chunkCount: chunks.length,
        completedChunks: chunks.length,
        message: 'Writing 384d vector records to browser IndexedDB...',
      });

      const savedDoc = await indexLocalDocument(file, chunks, embeddings);

      const elapsedMs = Math.round(performance.now() - startTime);

      setIngestion({
        filename: file.name,
        stage: 'done',
        progressPercent: 100,
        chunkCount: chunks.length,
        completedChunks: chunks.length,
        message: `Indexed ${chunks.length} chunks in ${elapsedMs}ms (Zero WAN egress)`,
      });

      addToast({
        title: '⚡ Local WASM RAG Ingested',
        message: `Indexed "${file.name}" into ${chunks.length} vector chunks in ${elapsedMs}ms without remote backend calls.`,
        type: 'success',
      });

      await refreshLocalData();
      setTimeout(() => setIngestion(null), 3000);
      return savedDoc;
    } catch (err: any) {
      setIngestion({
        filename: file.name,
        stage: 'error',
        progressPercent: 0,
        chunkCount: 0,
        completedChunks: 0,
        message: `Ingestion failed: ${err.message}`,
      });

      addToast({
        title: 'RAG Ingestion Error',
        message: err.message,
        type: 'error',
      });

      setTimeout(() => setIngestion(null), 4000);
      return null;
    }
  }, [computeEmbeddings, device, addToast, refreshLocalData]);

  /**
   * Search local vector database via cosine similarity
   */
  const searchLocally = useCallback(async (query: string, topK = 5): Promise<VectorSearchResult[]> => {
    if (!query.trim()) return [];

    const startTime = performance.now();
    try {
      // 1. Embed query
      const queryEmbeddings = await computeEmbeddings([query.trim()]);
      const queryVector = queryEmbeddings[0];

      // 2. Compute similarity
      const results = await searchLocalVectorStore(queryVector, query.trim(), topK);
      const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
      setLastSearchLatency(elapsed);

      return results;
    } catch (err) {
      console.error('[useLocalRAG] Search error:', err);
      return [];
    }
  }, [computeEmbeddings]);

  /**
   * Delete a local document
   */
  const deleteLocalDocument = useCallback(async (id: string, name: string): Promise<boolean> => {
    const success = await deleteLocalKBDocument(id);
    if (success) {
      addToast({
        title: 'Document Removed',
        message: `Removed "${name}" and its vector embeddings from local storage.`,
        type: 'info',
      });
      await refreshLocalData();
    }
    return success;
  }, [addToast, refreshLocalData]);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return {
    isModelLoaded,
    isModelLoading,
    modelProgress,
    device,
    ingestion,
    localDocs,
    stats,
    lastSearchLatency,
    loadModel,
    ingestFileLocally,
    searchLocally,
    deleteLocalDocument,
    refreshLocalData,
  };
}
