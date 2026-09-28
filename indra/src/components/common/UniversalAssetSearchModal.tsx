'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Crosshair,
  Layers,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Droplets,
  Gauge,
  Cpu,
  BookOpen,
  Network,
  LayoutDashboard,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { REGISTERED_EQUIPMENT_CATALOG, type EquipmentAsset } from '@/lib/canvas/equipment-catalog';
import { STANDARD_ENGINEERING_DOCS, type StandardDocument } from '@/lib/rag/standard-docs-catalog';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';

interface UniversalAssetSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  type: 'asset' | 'doc' | 'workflow' | 'route';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor?: string;
  icon: React.ElementType;
  action: () => void;
}

export default function UniversalAssetSearchModal({
  isOpen,
  onClose,
}: UniversalAssetSearchModalProps) {
  const router = useRouter();
  const { selectTag, sendMessage } = useIndraStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      sovereignAudio.playClick(0.08);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable index from assets, docs, workflows, and routes
  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];

    // 1. Navigation Routes
    items.push(
      {
        id: 'route-workbench',
        type: 'route',
        title: 'Workbench (Tri-Pane SCADA)',
        subtitle: 'Main conversational workspace, telemetry streaming, and Gen-UI micro-frontends',
        badge: 'Short: 1',
        icon: LayoutDashboard,
        action: () => {
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'route-canvas',
        type: 'route',
        title: 'Spatial P&ID Canvas (/canvas)',
        subtitle: 'Interactive ANSI/ISA-5.1 drafting workspace, 50+ equipment library, and minimap',
        badge: 'Short: 2',
        icon: Network,
        action: () => {
          router.push('/canvas');
          onClose();
        },
      },
      {
        id: 'route-knowledge',
        type: 'route',
        title: 'RAG Knowledge Base Explorer (/knowledge)',
        subtitle: 'Offline WASM vector database, semantic cosine search, and KaTeX equations',
        badge: 'Short: 3',
        icon: BookOpen,
        action: () => {
          router.push('/knowledge');
          onClose();
        },
      },
      {
        id: 'route-audit',
        type: 'route',
        title: 'Merkle Audit Ledger & HITL Timeline (/audit)',
        subtitle: 'OSHA 1910.119 cryptographic audit trail, SHA-256 verifier, and 3-tier sign-off',
        badge: 'Short: 4',
        icon: ShieldCheck,
        action: () => {
          router.push('/audit');
          onClose();
        },
      }
    );

    // 2. Industrial Simulation Workflows
    items.push(
      {
        id: 'wf-anti-surge',
        type: 'workflow',
        title: 'API 617 Compressor Anti-Surge Map (K-102)',
        subtitle: 'Surge limit line SLL, 10% operating margin, and fast recycle valve opening',
        badge: 'API 617',
        badgeColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
        icon: Activity,
        action: () => {
          sendMessage('Execute API 617 anti-surge evaluation for compressor K-102: calculate SLL and SCL curves');
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'wf-cogen',
        type: 'workflow',
        title: 'ASME PTC 6 Steam Turbine Cogen Balance (TG-201)',
        subtitle: 'Controlled extraction, condensing stage balance, MWe electrical & MWth thermal output',
        badge: 'ASME PTC 6',
        badgeColor: 'text-amber-400 bg-amber-950/80 border-amber-800',
        icon: Flame,
        action: () => {
          sendMessage('Calculate ASME PTC 6 steam turbine cogeneration heat balance for TG-201 at 105 bar throttle');
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'wf-cathodic',
        type: 'workflow',
        title: 'NACE SP0169 Cathodic Protection & CUI Heatmap (PL-104)',
        subtitle: 'Pipe-to-soil -850mV CSE potential criterion & 50°C-150°C CUI sweating risk',
        badge: 'NACE / API 581',
        badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
        icon: Zap,
        action: () => {
          sendMessage('Evaluate NACE SP0169 cathodic protection and CUI sweating zone for pipeline PL-104');
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'wf-cooling-tower',
        type: 'workflow',
        title: 'CTI ATC-105 Cooling Tower Psychrometrics (CT-301)',
        subtitle: 'Stull wet-bulb estimation, approach/range verification, and cycles of concentration',
        badge: 'CTI ATC-105',
        badgeColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
        icon: Droplets,
        action: () => {
          sendMessage('Calculate cooling tower thermal performance per CTI ATC-105 for CT-301 with Stull wet-bulb formula');
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'wf-teg',
        type: 'workflow',
        title: 'GPSA Sec 20 TEG Glycol Dehydration Contactor (V-204)',
        subtitle: 'Lean/rich concentration, reboiler thermal duty, and custody water dew point depression',
        badge: 'GPSA Sec 20',
        badgeColor: 'text-teal-400 bg-teal-950/80 border-teal-800',
        icon: Cpu,
        action: () => {
          sendMessage('Model GPSA Sec 20 TEG glycol dehydration unit V-204: calculate water dew point depression and reboiler duty');
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'wf-psv',
        type: 'workflow',
        title: 'API 520 / API 526 Pressure Relief Valve Sizing (PSV-101)',
        subtitle: 'Standard orifice D through R selection, choked critical flow verification, and accumulation',
        badge: 'API 520 / 526',
        badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-800',
        icon: Gauge,
        action: () => {
          sendMessage('Size emergency pressure relief valve PSV-101 per API 520 and select standard API 526 orifice');
          router.push('/workbench');
          onClose();
        },
      },
      {
        id: 'wf-rca',
        type: 'workflow',
        title: 'Root Cause Analysis (RCA) Multi-Methodology Suite (K-102)',
        subtitle: 'Fault Tree Analysis (FTA), 5-Why causality chain, Bow-Tie model, and Ishikawa 6M fishbone',
        badge: 'RCA / CAPA',
        badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-800',
        icon: Layers,
        action: () => {
          sendMessage('Execute root cause analysis for Compressor K-102 vibration trip: generate FTA, 5-Why, and Bow-Tie model');
          router.push('/workbench');
          onClose();
        },
      }
    );

    // 3. Registered Engineering Standards
    STANDARD_ENGINEERING_DOCS.forEach((doc: StandardDocument) => {
      items.push({
        id: `doc-${doc.id}`,
        type: 'doc',
        title: `${doc.id}: ${doc.title}`,
        subtitle: `${doc.standard} • ${doc.category} • ${doc.chunks?.length || 0} Vector Chunks (384D)`,
        badge: doc.standard,
        badgeColor: 'text-cyan-300 bg-cyan-950/60 border-cyan-800',
        icon: FileText,
        action: () => {
          router.push('/knowledge');
          onClose();
        },
      });
    });

    // 4. Registered P&ID Equipment Assets (50+ items)
    REGISTERED_EQUIPMENT_CATALOG.forEach((asset: EquipmentAsset) => {
      items.push({
        id: `asset-${asset.id}`,
        type: 'asset',
        title: `${asset.tag}: ${asset.name}`,
        subtitle: `${asset.subType} • ${asset.standard} • Category: ${asset.category.toUpperCase()}`,
        badge: asset.tag,
        badgeColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
        icon: Crosshair,
        action: () => {
          selectTag(asset.tag);
          broadcastSyncEvent({
            type: 'TAG_SELECTED',
            tag: asset.tag,
            metadata: { source: 'UniversalAssetSearchModal', assetId: asset.id },
          });
          onClose();
        },
      });
    });

    return items;
  }, [router, onClose, selectTag, sendMessage]);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return allItems.slice(0, 15);
    }
    const q = query.toLowerCase();
    return allItems
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [allItems, query]);

  // Handle keyboard navigation inside search list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      sovereignAudio.playClick(0.04);
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sovereignAudio.playClick(0.04);
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        sovereignAudio.playShortcut();
        selected.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl font-mono text-zinc-200 rounded-2xl">
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60">
          <Search className="w-4 h-4 text-emerald-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search 59+ P&ID assets (P-101, K-102), ASME/API standards, or workflows..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none font-mono"
          />
          <span className="text-[10px] text-zinc-500 bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-700 uppercase font-semibold">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 scrollbar-thin dark:scrollbar-thumb-zinc-700">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No assets, standards, or workflows found matching &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComp = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    sovereignAudio.playShortcut();
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-850 border border-emerald-500/60 text-zinc-100 shadow-sm'
                      : 'border border-transparent hover:bg-zinc-900/50 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        item.badgeColor || 'text-zinc-400 bg-zinc-900 border-zinc-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Shortcut Hints */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/50 text-[10px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span><strong className="text-zinc-200">&uarr;&darr;</strong> to navigate</span>
            <span><strong className="text-zinc-200">&crarr;</strong> to select</span>
            <span><strong className="text-zinc-200">ESC</strong> to exit</span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
            <ShieldCheck className="w-3 h-3" />
            <span>SOVEREIGN UNIVERSAL ASSET REGISTRY (127.0.0.1)</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
