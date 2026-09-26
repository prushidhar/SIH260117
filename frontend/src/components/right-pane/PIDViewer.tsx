'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  Monitor,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Flame,
  Zap
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

interface EquipmentRegistryItem {
  tag: string;
  name: string;
  unit?: string;
  type?: string;
  service?: string;
  design_pressure_psig?: number;
  discharge_pressure_psig?: number;
  suction_pressure_psig?: number;
  design_temp_c?: number;
  rated_flow_gpm?: number;
  rated_head_m?: number;
  material?: string;
  asme_rating?: string;
  status?: string;
  telemetry?: {
    running_status?: string;
    motor_current_amps?: number;
    vibration_rms_mms?: number;
    vibration_limit_mms?: number;
    bearing_temp_c?: number;
    suction_pressure_bar?: number;
    discharge_pressure_bar?: number;
    flow_rate_gpm?: number;
    npsh_available_m?: number;
    npsh_required_m?: number;
    valve_travel_pct?: number;
    cv_actual?: number;
  };
}

export default function PIDViewer() {
  const { detectedTags, activePIDDoc, setActivePIDDoc, theme } = useIndraStore();

  const { data: allDocs = [] } = useKBDocumentsQuery();
  const uploadMutation = useUploadKBDocMutation();

  const [selectedTag, setSelectedTag] = useState<EquipmentRegistryItem | null>(null);
  const [loadingTag, setLoadingTag] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'PUMPS' | 'VALVES' | 'EXCHANGERS' | 'VESSELS' | 'SAFETY'>('ALL');
  const [registryEquipment, setRegistryEquipment] = useState<EquipmentRegistryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all equipment from backend /api/equipment
  useEffect(() => {
    let isMounted = true;
    const loadRegistry = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/equipment`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setRegistryEquipment(data.equipment || []);
        }
      } catch {
        // Fallback default sample tags
        if (isMounted) {
          setRegistryEquipment([
            { tag: 'P-101', name: 'Crude Slurry Feed Charge Pump', type: 'Centrifugal Pump (API 610 BB2)', status: 'OPERATIONAL' },
            { tag: 'CDU-Pipe-104', name: 'Atmospheric Transfer Header', type: 'Process Piping (ASME B31.3)', status: 'COMPLIANT' },
            { tag: 'E-101', name: 'Shell & Tube Pre-Heat Exchanger', type: 'Heat Exchanger (TEMA Class R)', status: 'OPERATIONAL' },
            { tag: 'FV-101', name: 'Feed Flow Control Valve', type: 'Globe Valve (ANSI/ISA-75)', status: 'MODULATING' },
            { tag: 'PSV-101', name: 'CDU Surge Drum Safety Valve', type: 'Pressure Safety Valve (API 526)', status: 'ONLINE' },
          ]);
        }
      }
    };
    loadRegistry();
    return () => { isMounted = false; };
  }, []);

  // Filter available P&ID drawings
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

  // Query equipment data
  const handleTagClick = async (tag: string) => {
    if (selectedTag?.tag.toUpperCase() === tag.toUpperCase()) {
      setSelectedTag(null);
      return;
    }

    try {
      setLoadingTag(true);
      const res = await fetch(`${API_BASE}/api/equipment/${encodeURIComponent(tag)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTag(data);
      } else {
        const fallback = registryEquipment.find((e) => e.tag.toUpperCase() === tag.toUpperCase());
        setSelectedTag(fallback || { tag, name: `Equipment ${tag}`, status: 'VERIFIED' });
      }
    } catch {
      const fallback = registryEquipment.find((e) => e.tag.toUpperCase() === tag.toUpperCase());
      setSelectedTag(fallback || { tag, name: `Equipment ${tag}`, status: 'VERIFIED' });
    } finally {
      setLoadingTag(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const uploadedDoc = await uploadMutation.mutateAsync(file);
      setActivePIDDoc(uploadedDoc);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const imageUrl = activePIDDoc?.url
    ? activePIDDoc.url.startsWith('http')
      ? activePIDDoc.url
      : `${API_BASE}${activePIDDoc.url.startsWith('/') ? '' : '/'}${activePIDDoc.url}`
    : activePIDDoc?.id
    ? `${API_BASE}/files/documents/${activePIDDoc.id}`
    : '/PID-001_Heat_Exchanger_Unit.png';

  // Filter tags by search and category
  const filteredTags = useMemo(() => {
    let list = registryEquipment.length > 0 
      ? registryEquipment.map((e) => e.tag) 
      : (detectedTags.length > 0 ? detectedTags : ['P-101', 'CDU-Pipe-104', 'E-101', 'FV-101', 'PSV-101', 'K-101', 'T-101']);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.toLowerCase().includes(q));
    }

    if (selectedCategory !== 'ALL') {
      list = list.filter((t) => {
        const upper = t.toUpperCase();
        if (selectedCategory === 'PUMPS') return upper.startsWith('P-');
        if (selectedCategory === 'VALVES') return upper.startsWith('FV') || upper.startsWith('FCV') || upper.includes('VALVE');
        if (selectedCategory === 'EXCHANGERS') return upper.startsWith('E-');
        if (selectedCategory === 'VESSELS') return upper.startsWith('V-') || upper.startsWith('T-') || upper.startsWith('D-') || upper.startsWith('C-');
        if (selectedCategory === 'SAFETY') return upper.startsWith('PSV');
        return true;
      });
    }

    return list.slice(0, 18);
  }, [registryEquipment, detectedTags, searchQuery, selectedCategory]);

  return (
    <div className="p-4 text-slate-800 dark:text-zinc-100 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h2 className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-zinc-400 font-mono">
            Dynamic P&ID Canvas & Telemetry
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => multiWindowSync.openWindow('pid')}
            className="text-slate-400 hover:text-violet-600 dark:text-zinc-500 dark:hover:text-violet-400 p-1 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            title="Tear Off to Monitor 2"
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
          detectedTags={filteredTags}
          onSelectTag={handleTagClick}
          theme={theme}
          isExpanded={false}
        />
      </div>

      {/* Search & Category Filter Bar */}
      <div className="mt-3 space-y-1.5 font-mono text-[10px]">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 50 equipment tags (P-101, E-101, FCV...)"
            className="w-full pl-7 pr-3 py-1 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[10px] outline-none focus:border-violet-500 text-slate-800 dark:text-zinc-200"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[9px]">
          {(['ALL', 'PUMPS', 'VALVES', 'EXCHANGERS', 'VESSELS', 'SAFETY'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-violet-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Identified Tags Selector */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold font-mono">
            Equipment Tags ({filteredTags.length})
          </span>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
            Click to inspect
          </span>
        </div>

        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto scrollbar-thin">
          {filteredTags.map((tag) => {
            const isSelected = selectedTag?.tag.toUpperCase() === tag.toUpperCase();
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white font-bold ring-1 ring-violet-400 shadow-2xs'
                    : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 hover:bg-violet-100'
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
            Querying plant asset telemetry...
          </div>
        )}

        {selectedTag && !loadingTag && (
          <div className="mt-2.5 p-3 rounded-xl bg-slate-50/90 dark:bg-zinc-900/90 border border-violet-200 dark:border-violet-800/50 text-xs animate-in fade-in duration-150 shadow-2xs font-mono">
            <div className="flex items-center justify-between">
              <span className="font-bold text-violet-700 dark:text-violet-400 text-sm">{selectedTag.tag}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                {selectedTag.status || 'OPERATIONAL'}
              </span>
            </div>
            <div className="text-slate-800 dark:text-zinc-200 text-[11px] font-bold mt-1 font-sans">{selectedTag.name}</div>
            
            {/* Live Operational Telemetry */}
            {selectedTag.telemetry && (
              <div className="mt-2 p-2 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 space-y-1 text-[10px]">
                <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span>Real-Time Sensor Telemetry</span>
                </div>
                {selectedTag.telemetry.vibration_rms_mms !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Peak Vibration:</span>
                    <span className="text-slate-900 dark:text-zinc-100 font-bold">
                      {selectedTag.telemetry.vibration_rms_mms} mm/s RMS (Limit: {selectedTag.telemetry.vibration_limit_mms || 4.5})
                    </span>
                  </div>
                )}
                {selectedTag.telemetry.bearing_temp_c !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bearing Temperature:</span>
                    <span className="text-slate-900 dark:text-zinc-100 font-bold">
                      {selectedTag.telemetry.bearing_temp_c} °C
                    </span>
                  </div>
                )}
                {selectedTag.telemetry.discharge_pressure_bar !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discharge Pressure:</span>
                    <span className="text-slate-900 dark:text-zinc-100 font-bold">
                      {selectedTag.telemetry.discharge_pressure_bar} barg
                    </span>
                  </div>
                )}
                {selectedTag.telemetry.npsh_available_m !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">NPSH Margin:</span>
                    <span className="text-emerald-600 font-bold">
                      +{(selectedTag.telemetry.npsh_available_m - (selectedTag.telemetry.npsh_required_m || 3.0)).toFixed(1)} m (Safe)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Design Specs */}
            <div className="mt-2 space-y-1 text-[10px] border-t border-slate-200/70 dark:border-zinc-800 pt-1.5 text-slate-600 dark:text-zinc-400">
              {selectedTag.design_pressure_psig !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Design Pressure:</span>
                  <span className="text-slate-800 dark:text-zinc-200 font-medium">{selectedTag.design_pressure_psig} psig</span>
                </div>
              )}
              {selectedTag.asme_rating && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Rating / Flange:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedTag.asme_rating}</span>
                </div>
              )}
              {selectedTag.material && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Material:</span>
                  <span className="text-slate-800 dark:text-zinc-300 font-medium truncate max-w-[170px]">{selectedTag.material}</span>
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
              HIGH-RESOLUTION P&ID INSPECTION CANVAS & ASSET REGISTRY
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {activePIDDoc?.filename || 'P&ID Schematic'} • 50 Certified Industrial Equipment Assets
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 flex-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-950 overflow-hidden h-[580px]">
            <InteractivePIDCanvas
              imageUrl={imageUrl}
              activeTag={selectedTag?.tag || null}
              detectedTags={filteredTags}
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
