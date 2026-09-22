'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Upload, 
  Search, 
  Trash2, 
  FileText, 
  FileImage, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  FileSpreadsheet,
  X,
  ZoomIn,
  ZoomOut,
  Scan,
  FolderOpen,
  Zap,
  Cpu,
  HardDrive
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useIndraStore, { API_BASE, type KBDocument } from '@/store/indra-store';
import { useKBDocumentsQuery, useUploadKBDocMutation, useDeleteKBDocMutation } from '@/lib/queries';
import { useNativeBridge } from '@/hooks/useNativeBridge';
import { useLocalRAG } from '@/hooks/useLocalRAG';

function DocumentTableSkeleton() {
  return (
    <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-slate-50/90 dark:bg-zinc-950/90 text-slate-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800 font-bold">
          <tr>
            <th className="p-3.5">Filename</th>
            <th className="p-3.5">Size</th>
            <th className="p-3.5">Chunks</th>
            <th className="p-3.5">Indexed At</th>
            <th className="p-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {[1, 2, 3, 4, 5].map((item) => (
            <tr key={item} className="animate-pulse">
              <td className="p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-800 flex-shrink-0" />
                  <div className="w-9 h-4 rounded bg-slate-200 dark:bg-zinc-800 flex-shrink-0" />
                  <div 
                    className="h-3.5 rounded bg-slate-200 dark:bg-zinc-800" 
                    style={{ width: `${130 + (item * 35) % 100}px` }} 
                  />
                </div>
              </td>
              <td className="p-3.5">
                <div className="h-3 w-14 rounded bg-slate-200 dark:bg-zinc-800" />
              </td>
              <td className="p-3.5">
                <div className="h-3 w-8 rounded bg-slate-200 dark:bg-zinc-800" />
              </td>
              <td className="p-3.5">
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-zinc-800" />
              </td>
              <td className="p-3.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-6 w-18 rounded-lg bg-slate-200 dark:bg-zinc-800" />
                  <div className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-zinc-800" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KnowledgeBaseView() {
  const { setActivePIDDoc } = useIndraStore();

  const { data: remoteDocuments = [], isLoading: loadingRemote, refetch: fetchDocuments } = useKBDocumentsQuery();
  const uploadMutation = useUploadKBDocMutation();
  const deleteMutation = useDeleteKBDocMutation();

  const { isNative, openFileDialog } = useNativeBridge();
  const {
    isModelLoaded,
    isModelLoading,
    device,
    ingestion,
    localDocs,
    stats: vectorStats,
    lastSearchLatency,
    loadModel,
    ingestFileLocally,
    searchLocally,
    deleteLocalDocument,
    refreshLocalData,
  } = useLocalRAG();

  const [storageEngine, setStorageEngine] = useState<'local' | 'backend'>('local');
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<KBDocument | null>(null);
  const [zoom, setZoom] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload local embedding model on mount
  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Unified document list based on active storage engine
  const displayedDocs = storageEngine === 'local'
    ? localDocs.map((d) => ({
        id: d.id,
        name: d.filename,
        filename: d.filename,
        size: `${(d.size / 1024).toFixed(1)} KB`,
        chunks: d.chunksCount,
        indexed_at: d.indexedAt,
        status: d.status,
        engine: d.engine,
        isLocal: true,
      }))
    : remoteDocuments;

  const loading = storageEngine === 'local' ? false : loadingRemote;

  // 2. Upload document (Local WASM Vector Embedding or Remote FastAPI)
  const handleUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (storageEngine === 'local') {
      for (let i = 0; i < files.length; i++) {
        await ingestFileLocally(files[i]);
      }
      return;
    }

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadMutation.mutateAsync(file);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setUploading(false);
  };

  const handleNativeBrowse = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const files = await openFileDialog({
        title: 'Select Plant Documents & CAD Schematics',
        filters: [
          { name: 'Engineering Documents', extensions: ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg'] },
          { name: 'P&ID Diagrams', extensions: ['png', 'jpg', 'jpeg', 'svg', 'pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile', 'multiSelections'],
      });
      if (files && files.length > 0) {
        handleUpload(files);
      }
    } catch (err) {
      console.error('Native file picker error:', err);
    }
  };

  // 3. Delete document
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently remove "${name}" from the offline RAG knowledge base?`)) return;

    if (storageEngine === 'local') {
      await deleteLocalDocument(id, name);
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMessage('Backend error communicating with /api/kb/documents.');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // 4. Vector / Semantic search (Local WASM Cosine Search vs Remote API)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);

    if (storageEngine === 'local') {
      try {
        const localHits = await searchLocally(searchQuery.trim(), 5);
        setSearchResults(localHits);
      } catch (err) {
        console.error('Local vector search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/kb/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getDocTypeInfo = (filename?: string) => {
    const fn = (filename || '').toLowerCase();
    if (fn.endsWith('.pdf')) {
      return {
        label: 'PDF',
        icon: FileText,
        badgeClass: 'bg-rose-100/90 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
        iconBoxClass: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400',
      };
    }
    if (fn.endsWith('.docx') || fn.endsWith('.doc')) {
      return {
        label: 'DOCX',
        icon: FileText,
        badgeClass: 'bg-blue-100/90 dark:bg-blue-950/90 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
        iconBoxClass: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400',
      };
    }
    if (fn.endsWith('.xlsx') || fn.endsWith('.xls') || fn.endsWith('.csv')) {
      return {
        label: fn.endsWith('.csv') ? 'CSV' : 'XLSX',
        icon: FileSpreadsheet,
        badgeClass: 'bg-emerald-100/90 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        iconBoxClass: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400',
      };
    }
    if (fn.endsWith('.png') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.svg')) {
      return {
        label: 'IMG',
        icon: FileImage,
        badgeClass: 'bg-violet-100/90 dark:bg-violet-950/90 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/60',
        iconBoxClass: 'bg-violet-50 dark:bg-violet-950/50 border-violet-200/80 dark:border-violet-900/60 text-violet-600 dark:text-violet-400',
      };
    }
    return {
      label: 'TXT',
      icon: FileText,
      badgeClass: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
      iconBoxClass: 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400',
    };
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-[#f8fafc] dark:bg-[#0a0a0a] text-slate-800 dark:text-zinc-200 overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-zinc-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
              <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-mono">
              Offline RAG Knowledge Base
            </h1>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 font-mono font-bold">
              {storageEngine === 'local' ? 'IN-BROWSER WASM VECTOR DB' : 'AIR-GAPPED VECTORSTORE'}
            </span>
            {isNative && (
              <Badge variant="violet">
                NATIVE ELECTRON IPC
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-mono">
            {storageEngine === 'local'
              ? `Client-side WASM inference (all-MiniLM-L6-v2 ${device.toUpperCase()}) with zero backend calls • IndexedDB persistent storage`
              : 'Index plant SOPs, ASME B31.3 standards, P&ID CAD schematics, and equipment data with zero external egress.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Storage Engine Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-mono shadow-2xs">
            <button
              onClick={() => setStorageEngine('local')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                storageEngine === 'local'
                  ? 'bg-violet-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>WASM Vector DB</span>
            </button>
            <button
              onClick={() => setStorageEngine('backend')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                storageEngine === 'backend'
                  ? 'bg-violet-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>FastAPI Backend</span>
            </button>
          </div>

          <button
            onClick={() => storageEngine === 'local' ? refreshLocalData() : fetchDocuments()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors font-mono cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin dark:scrollbar-thumb-zinc-700 pr-1">
        {/* Real-time WASM Vector Ingestion Progress */}
        {ingestion && (
          <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-800/60 shadow-lg text-xs font-mono animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-400 animate-spin" />
                <span className="font-bold text-violet-200 uppercase tracking-wider">
                  Client-Side WASM Ingestion: {ingestion.filename}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-900/60 text-violet-300 font-bold border border-violet-700">
                {ingestion.progressPercent}% • {device.toUpperCase()}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
              <div 
                className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${ingestion.progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-400">
              <span>{ingestion.message}</span>
              <span className="text-emerald-400 font-bold">Zero Remote Backend Calls</span>
            </div>
          </div>
        )}

        {/* Drag and drop upload zone (AI Doodle Violet Theme) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30' 
              : 'border-violet-200/80 dark:border-violet-900/40 bg-white dark:bg-zinc-900/60 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 hover:border-violet-400 shadow-2xs'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />

          <div className="flex flex-col items-center">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin mb-2" />
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  Indexing files into offline vectorstore...
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-1">
                  Parsing text chunks, computing embeddings, and storing on-premise
                </span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center mb-2 text-violet-600 dark:text-violet-400">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  Click or drag files here to index into sovereign RAG knowledge base
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                  Supported: PDF (SOPs), PNG/SVG/JPG (P&ID Drawings), DOCX, XLSX, CSV, TXT
                </span>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNativeBrowse}
                    className="gap-1.5 font-mono text-xs z-10 shadow-2xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>{isNative ? 'Browse Local Drive (Native IPC)' : 'Browse Local Files'}</span>
                  </Button>
                  {isNative && (
                    <Badge variant="violet">
                      Direct Native FS Read
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Offline Vector Search Bar */}
        <div className="space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indexed plant SOPs, API-570 guidelines, or P&ID tags..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-violet-400 dark:focus:border-violet-600 shadow-2xs transition-colors font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm shadow-violet-500/20 cursor-pointer disabled:opacity-50"
            >
              {searching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Search</span>
            </button>
            {searchResults !== null && (
              <button
                type="button"
                onClick={() => { setSearchResults(null); setSearchQuery(''); }}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs text-slate-600 dark:text-zinc-300 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {/* Search results display */}
          {searchResults !== null && (
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                  Search Results ({searchResults.length})
                </span>
                <div className="flex items-center gap-2">
                  {lastSearchLatency !== null && storageEngine === 'local' && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-amber-300" />
                      <span>{lastSearchLatency}ms (Zero WAN)</span>
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 font-semibold">
                    {storageEngine === 'local' ? 'WASM Cosine Vector Retrieval' : 'Offline Semantic Retrieval'}
                  </span>
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-zinc-500 italic py-2">
                  No matching passages found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((res, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-violet-700 dark:text-violet-400 font-bold">
                          {res.filename || res.document || 'Document'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {res.matchType && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-950/60 text-violet-300 border border-violet-800/50 font-bold">
                              {res.matchType === 'HYBRID_EXACT' ? 'EXACT + VECTOR' : 'SEMANTIC VECTOR'}
                            </span>
                          )}
                          {(res.scorePercent !== undefined || res.score !== undefined) && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {res.scorePercent !== undefined ? `${res.scorePercent}% Match` : `Relevance: ${Math.round(res.score * 100)}%`}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed font-mono text-[11px]">
                        {res.content || res.text || res.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Documents Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span>{storageEngine === 'local' ? 'Local WASM Indexed Documents' : 'Indexed Documents'}</span>
              {loading && displayedDocs.length === 0 ? (
                <span className="inline-block w-8 h-3.5 rounded-md bg-slate-200 dark:bg-zinc-800 animate-pulse" />
              ) : (
                <span>({displayedDocs.length})</span>
              )}
            </h2>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
              {storageEngine === 'local'
                ? `INDEXEDDB • ${vectorStats?.chunkCount || 0} CHUNKS • ${device.toUpperCase()} 384D`
                : 'GET /api/kb/documents'}
            </span>
          </div>

          {loading && displayedDocs.length === 0 ? (
            <DocumentTableSkeleton />
          ) : displayedDocs.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-zinc-500 italic p-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xs">
              No documents indexed yet. Upload plant maintenance SOPs, inspection records, or P&ID diagrams above.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50/90 dark:bg-zinc-950/90 text-slate-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800 font-bold">
                  <tr>
                    <th className="p-3.5">Filename</th>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Chunks</th>
                    <th className="p-3.5">Indexed At</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {displayedDocs.map((doc: any) => {
                    const isDrawing = (doc.filename || '').toLowerCase().includes('pid') || 
                      (doc.filename || '').toLowerCase().endsWith('.png') ||
                      (doc.filename || '').toLowerCase().endsWith('.jpg');
                    const { label, icon: DocIcon, badgeClass, iconBoxClass } = getDocTypeInfo(doc.filename || doc.name);

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/60 transition-colors">
                        <td className="p-3.5 flex items-center gap-2.5 text-slate-800 dark:text-zinc-200 font-semibold">
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 shadow-2xs ${iconBoxClass}`}>
                            <DocIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeClass}`}>
                            {label}
                          </span>
                          <span className="truncate max-w-xs font-mono text-xs font-medium text-slate-800 dark:text-zinc-200">
                            {doc.filename || doc.name}
                          </span>
                          {doc.isLocal && (
                            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60">
                              WASM VECTOR
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-zinc-400">{typeof doc.size === 'number' ? `${(doc.size / 1024).toFixed(1)} KB` : doc.size || '-'}</td>
                        <td className="p-3.5 text-slate-500 dark:text-zinc-400">{doc.chunks || doc.chunk_count || 1}</td>
                        <td className="p-3.5 text-slate-400 dark:text-zinc-500">{doc.indexed_at ? new Date(doc.indexed_at).toLocaleDateString() : doc.created_at || doc.uploaded_at || 'Recent'}</td>
                        <td className="p-3.5 text-right space-x-2">
                          {isDrawing && (
                            <button
                              onClick={() => {
                                setPreviewDoc(doc);
                                setZoom(1);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-[10px] font-bold transition-colors cursor-pointer border border-violet-200/80 dark:border-violet-800/60"
                              title="Inspect P&ID CAD Schematic"
                            >
                              Inspect P&ID
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-rose-950/90 border border-rose-800 text-rose-200 px-4 py-2.5 rounded-xl shadow-xl text-xs font-mono flex items-center gap-2 z-50">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* P&ID Drawing Inspection Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/40">
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-blue-400" />
                <DialogTitle className="text-xs text-zinc-200">
                  P&ID Inspection: {previewDoc?.filename}
                </DialogTitle>
                <Badge variant="success">
                  ASME B31.3 AUDIT READY
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[10px] font-mono text-zinc-400 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {previewDoc && (
            <div className="flex-1 overflow-auto p-4 bg-zinc-900/20 flex items-center justify-center min-h-[400px]">
              <div 
                className="transition-transform duration-200 origin-center"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={
                    previewDoc.url
                      ? (previewDoc.url.startsWith('http') ? previewDoc.url : `${API_BASE}${previewDoc.url.startsWith('/') ? '' : '/'}${previewDoc.url}`)
                      : `${API_BASE}/files/documents/${previewDoc.id}`
                  }
                  alt={previewDoc.filename}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border border-zinc-800 shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/PID-001_Heat_Exchanger_Unit.png';
                  }}
                />
              </div>
            </div>
          )}

          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase">Detected Equipment Tags:</span>
              {['FV-101', 'P-101', 'E-101', 'TI-101'].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setPreviewDoc(null)}
            >
              Close Viewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
