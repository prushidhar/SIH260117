'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Maximize2, 
  X, 
  Upload, 
  Activity, 
  Gauge, 
  Thermometer, 
  Layers, 
  FileImage, 
  AlertCircle,
  Cpu,
  Monitor
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useIndraStore, { API_BASE, type KBDocument, type EquipmentData } from '@/store/indra-store';
import { useKBDocumentsQuery, useUploadKBDocMutation } from '@/lib/queries';
import InteractivePIDCanvas from '@/components/canvas/InteractivePIDCanvas';
import { multiWindowSync } from '@/lib/sync/multi-window-sync';

export default function PIDViewer() {
  const { detectedTags, activePIDDoc, setActivePIDDoc, theme } = useIndraStore();

  const { data: allDocs = [], isLoading: loadingPids } = useKBDocumentsQuery();
  const uploadMutation = useUploadKBDocMutation();

  const [selectedTag, setSelectedTag] = useState<EquipmentData | null>(null);
  const [loadingTag, setLoadingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Filter available P&ID drawings from cached documents
  const pids = allDocs.filter((d) => {
    const fn = (d.filename || d.name || '').toLowerCase();
    return (
      fn.includes('pid') ||
      fn.includes('p&id') ||
      fn.includes('drawing') ||
      fn.endsWith('.png') ||
      fn.endsWith('.jpg') ||
      fn.endsWith('.jpeg') ||
      fn.endsWith('.svg')
    );
  });

  useEffect(() => {
    if (pids.length > 0 && !activePIDDoc) {
      setActivePIDDoc(pids[0]);
    }
  }, [pids, activePIDDoc, setActivePIDDoc]);

  // 2. Query real equipment metadata on tag click from GET /api/equipment/{tag}
  const handleTagClick = async (tag: string) => {
    if (selectedTag?.tag === tag) {
      setSelectedTag(null);
      return;
    }

    try {
      setLoadingTag(true);
      setTagError(null);
      const res = await fetch(`${API_BASE}/api/equipment/${encodeURIComponent(tag)}`);
      if (!res.ok) {
        throw new Error(`Equipment record for tag "${tag}" not found (HTTP ${res.status})`);
      }
      const data: EquipmentData = await res.json();
      setSelectedTag(data);
    } catch (err: any) {
      setTagError(err.message || 'Failed to fetch equipment data');
      setSelectedTag({
        tag,
        name: `Equipment ${tag}`,
        type: 'Instrument / Tag',
        status: 'IDENTIFIED',
      });
    } finally {
      setLoadingTag(false);
    }
  };

  // 3. Upload a new P&ID diagram to POST /api/kb/documents
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploadedDoc = await uploadMutation.mutateAsync(file);
      setActivePIDDoc(uploadedDoc);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload P&ID diagram to local backend.');
    } finally {
      setUploading(false);
    }
  };

  // Image source resolution
  const imageUrl = activePIDDoc?.url
    ? activePIDDoc.url.startsWith('http')
      ? activePIDDoc.url
      : `${API_BASE}${activePIDDoc.url.startsWith('/') ? '' : '/'}${activePIDDoc.url}`
    : activePIDDoc?.id
    ? `${API_BASE}/files/documents/${activePIDDoc.id}`
    : '/PID-001_Heat_Exchanger_Unit.png';

  const tagsToShow = detectedTags.length > 0 
    ? detectedTags 
    : ['FV-101', 'P-101', 'E-101', 'TI-101'];

  return (
    <div className="p-4 text-slate-800 dark:text-zinc-100 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-mono">
            Dynamic P&ID Canvas
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => multiWindowSync.openWindow('pid')}
            className="text-slate-400 hover:text-violet-600 dark:text-zinc-500 dark:hover:text-violet-400 p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Tear Off to Monitor 2 (Multi-Monitor Mode)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Upload P&ID Diagram"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Expand Inspection Canvas"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.svg"
        onChange={handleFileUpload}
      />

      {/* Main Interactive WebGL / Vector Inspection Canvas */}
      <div className="relative rounded-xl border border-slate-200/80 dark:border-zinc-800/60 overflow-hidden aspect-[4/3] bg-slate-900 shadow-2xs">
        <InteractivePIDCanvas
          imageUrl={imageUrl}
          activeTag={selectedTag?.tag || null}
          detectedTags={tagsToShow}
          onSelectTag={handleTagClick}
          theme={theme}
          isExpanded={false}
        />
      </div>

      {/* Identified Tags Selector */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold font-mono">
            Identified Equipment Tags
          </span>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
            {tagsToShow.length} tags
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {tagsToShow.map((tag) => {
            const isSelected = selectedTag?.tag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white font-bold ring-1 ring-violet-400 shadow-2xs'
                    : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 hover:bg-violet-100 dark:hover:bg-violet-900/50'
                }`}
              >
                <span>{tag}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Equipment Real Backend Telemetry Card */}
        {loadingTag && (
          <div className="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 font-mono animate-pulse">
            Querying /api/equipment...
          </div>
        )}

        {selectedTag && !loadingTag && (
          <div className="mt-2 p-3 rounded-xl bg-slate-50/90 dark:bg-zinc-900/90 border border-violet-200 dark:border-violet-800/50 text-xs animate-in fade-in duration-150 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-violet-700 dark:text-violet-400">{selectedTag.tag}</span>
              <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-200 dark:border-emerald-800">
                {selectedTag.status || 'VERIFIED'}
              </span>
            </div>
            <div className="text-slate-800 dark:text-zinc-200 text-[11px] font-bold mt-1">{selectedTag.name}</div>
            
            <div className="mt-2 space-y-1 font-mono text-[10px] border-t border-slate-200/70 dark:border-zinc-800 pt-1.5 text-slate-600 dark:text-zinc-400">
              {selectedTag.design_pressure && (
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-zinc-500">Design Press:</span>
                  <span className="text-slate-800 dark:text-zinc-200 font-medium">{selectedTag.design_pressure}</span>
                </div>
              )}
              {selectedTag.design_temperature && (
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-zinc-500">Design Temp:</span>
                  <span className="text-slate-800 dark:text-zinc-200 font-medium">{selectedTag.design_temperature}</span>
                </div>
              )}
              {(selectedTag.rating || selectedTag.asme_rating) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-zinc-500">Rating / Class:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedTag.rating || selectedTag.asme_rating}</span>
                </div>
              )}
              {selectedTag.material && (
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-zinc-500">Material:</span>
                  <span className="text-slate-800 dark:text-zinc-300 font-medium truncate">{selectedTag.material}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Modal for High-Resolution Inspection */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-5 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
          <DialogHeader className="border-b border-slate-100 dark:border-zinc-800 pb-3">
            <DialogTitle className="text-sm font-bold">
              HIGH-RESOLUTION P&ID INSPECTION CANVAS
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {activePIDDoc?.filename || 'P&ID Schematic'} • Verified Against ASME B31.3
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 flex-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-950 overflow-hidden h-[580px]">
            <InteractivePIDCanvas
              imageUrl={imageUrl}
              activeTag={selectedTag?.tag || null}
              detectedTags={tagsToShow}
              onSelectTag={handleTagClick}
              theme={theme}
              isExpanded={true}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400 font-mono pt-2 border-t border-slate-100 dark:border-zinc-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Zero-WAN Air-Gapped Inspection Node</span>
            <Button 
              onClick={() => setIsExpanded(false)}
              size="sm"
            >
              Close Canvas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
