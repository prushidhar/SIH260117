'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  Flame,
  Gauge,
  Sliders,
  Wind,
  Database,
  Filter,
  PackagePlus,
  HelpCircle,
} from 'lucide-react';
import {
  REGISTERED_EQUIPMENT_CATALOG,
  type EquipmentAsset,
  type EquipmentCategory,
} from '@/lib/canvas/equipment-catalog';

interface EquipmentSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddDirect?: (asset: EquipmentAsset) => void;
}

export default function EquipmentSidebar({
  isOpen,
  onToggle,
  onAddDirect,
}: EquipmentSidebarProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: { id: string; label: string; count: number; icon: any }[] = [
    { id: 'all', label: 'All Assets', count: REGISTERED_EQUIPMENT_CATALOG.length, icon: Layers },
    {
      id: 'pumps',
      label: 'Pumps & Drivers',
      count: REGISTERED_EQUIPMENT_CATALOG.filter((a) => a.category === 'pumps').length,
      icon: Gauge,
    },
    {
      id: 'exchangers',
      label: 'Heat Exchangers',
      count: REGISTERED_EQUIPMENT_CATALOG.filter((a) => a.category === 'exchangers').length,
      icon: Flame,
    },
    {
      id: 'columns',
      label: 'Columns & Vessels',
      count: REGISTERED_EQUIPMENT_CATALOG.filter((a) => a.category === 'columns').length,
      icon: Sliders,
    },
    {
      id: 'valves',
      label: 'Valves & Relief',
      count: REGISTERED_EQUIPMENT_CATALOG.filter((a) => a.category === 'valves').length,
      icon: Filter,
    },
    {
      id: 'compressors',
      label: 'Compressors & Turbines',
      count: REGISTERED_EQUIPMENT_CATALOG.filter((a) => a.category === 'compressors').length,
      icon: Wind,
    },
    {
      id: 'tanks',
      label: 'Tanks & In-Line',
      count: REGISTERED_EQUIPMENT_CATALOG.filter((a) => a.category === 'tanks' || a.category === 'inline').length,
      icon: Database,
    },
  ];

  const filteredAssets = useMemo(() => {
    return REGISTERED_EQUIPMENT_CATALOG.filter((asset) => {
      const matchesCat =
        selectedCategory === 'all' ||
        (selectedCategory === 'tanks'
          ? asset.category === 'tanks' || asset.category === 'inline'
          : asset.category === selectedCategory);

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        asset.tag.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.standard.toLowerCase().includes(q) ||
        asset.subType.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, search]);

  const handleDragStart = (e: React.DragEvent, asset: EquipmentAsset) => {
    e.dataTransfer.setData('application/indra-asset', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={`relative z-20 h-full flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ease-in-out select-none shadow-2xl ${
        isOpen ? 'w-80 min-w-[320px]' : 'w-12 min-w-[48px]'
      }`}
    >
      {/* Sidebar Header & Toggle */}
      <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900/60">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-xs tracking-wider text-zinc-100">
              EQUIPMENT LIBRARY
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-mono text-emerald-400 font-bold">
              {REGISTERED_EQUIPMENT_CATALOG.length}+
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <PackagePlus className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title={isOpen ? 'Collapse Library Sidebar' : 'Expand Equipment Library (50+ assets)'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Search Input Bar */}
          <div className="p-2.5 border-b border-zinc-800/80 bg-zinc-950/80">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tag (P-101, E-201, C-301)..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                DRAG ONTO GRID
              </span>
              <span>{filteredAssets.length} found</span>
            </div>
          </div>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-zinc-800/60 bg-zinc-900/30 no-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 font-bold'
                      : 'bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                  <span className="text-[9px] opacity-70">({cat.count})</span>
                </button>
              );
            })}
          </div>

          {/* Asset List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredAssets.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-zinc-500">
                No plant equipment found matching &quot;{search}&quot;.
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  onClick={() => onAddDirect?.(asset)}
                  className="group relative p-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-emerald-500/60 transition-all duration-150 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-emerald-500/10"
                >
                  {/* Top Row: Tag, Category, and Standard */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: asset.color }}
                      />
                      <span className="font-mono font-bold text-xs text-zinc-100 tracking-wider">
                        {asset.tag}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400 uppercase">
                      {asset.category}
                    </span>
                  </div>

                  {/* Asset Name */}
                  <div className="text-xs font-semibold text-zinc-300 line-clamp-1 mb-1 group-hover:text-emerald-400 transition-colors">
                    {asset.name}
                  </div>

                  {/* Standard & Sub-Type */}
                  <div className="text-[10px] font-mono text-zinc-500 truncate mb-2">
                    {asset.standard}
                  </div>

                  {/* Spec preview badges */}
                  <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-zinc-800/60 text-[9px] font-mono">
                    {asset.specs.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="flex flex-col truncate">
                        <span className="text-zinc-500 uppercase truncate">{s.label}</span>
                        <span className="text-zinc-300 font-semibold truncate">{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Hover Instruction Overlay */}
                  <div className="absolute inset-0 rounded-xl bg-emerald-950/20 border border-emerald-500/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-end pr-2">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-zinc-950/90 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      Drag / Click +
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Drag Tip */}
          <div className="p-2 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>ISA-5.1 STENCILS</span>
            <span className="text-emerald-400">SNAP-TO-GRID ACTIVE</span>
          </div>
        </>
      )}
    </div>
  );
}
