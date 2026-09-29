'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  Thermometer,
  Layers,
  Crosshair,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Box
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import type { HazardousAreaExCardProps } from '../types';

export default function HazardousAreaExCard({
  assetTag = 'JB-101 (Zone 1 Group IIC)',
  title = 'IEC 60079 / API RP 500 HAZARDOUS AREA INTEGRITY',
  measuredJointGapMm = 0.12,
  allowableJointGapMm = 0.15,
  measuredSurfaceTempC = 118.5,
  tClassLimitTempC = 135.0,
  tClassRating = 'T4',
  hydrogenAitC = 560.0,
  ingressProtection = 'IP66',
  certificationStamp = 'ATEX / IECEx Ex d IIC T4 Gb PASS',
}: HazardousAreaExCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  const [selectedTag, setSelectedTag] = useState<string>(assetTag);
  const [currentGap, setCurrentGap] = useState<number>(measuredJointGapMm);

  // Calculations
  const gapMarginPercent = parseFloat((((allowableJointGapMm - currentGap) / allowableJointGapMm) * 100).toFixed(1));
  const isGapSafe = currentGap <= allowableJointGapMm;
  const thermalMarginC = parseFloat((tClassLimitTempC - measuredSurfaceTempC).toFixed(1));
  const aitMarginC = parseFloat((hydrogenAitC - measuredSurfaceTempC).toFixed(1));

  const handleLocateTag = () => {
    const tagMatch = selectedTag.split(' ')[0] || 'JB-101';
    selectTag(tagMatch);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: tagMatch,
      metadata: { source: 'HazardousAreaExCard', currentGap, measuredSurfaceTempC },
    });
    addToast({
      type: 'info',
      title: 'Ex Enclosure Located',
      message: `Centered P&ID schematic on hazardous area junction box ${tagMatch}.`,
    });
  };

  const handleExportCertificate = () => {
    const now = new Date().toLocaleTimeString();
    const tagMatch = selectedTag.split(' ')[0] || 'JB-101';
    addDeliverable({
      id: `del-ex-${Date.now()}`,
      name: `IEC_60079_Ex_Integrity_Certificate_${tagMatch}.docx`,
      filename: `IEC_60079_Ex_Integrity_Certificate_${tagMatch}.docx`,
      type: 'docx',
      size: '1.9 MB',
      generatedAt: now,
      timestamp: now,
      description: `IEC 60079-1 Flameproof Ex d and IEC 60079-14 hazardous area compliance verification for ${selectedTag}.`,
      url: '#',
      hash: 'sha256:33bb91c0eef188a107294829ad01ff872138bcfe88410298a0029b389145ea01',
    });
    addToast({
      type: 'success',
      title: 'Ex Certification Deliverable Generated',
      message: `Exported IECEx statutory inspection certificate for ${tagMatch}.`,
    });
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-100 overflow-hidden shadow-xs font-sans text-xs">
      {/* 1. Header with Standards Badge & Asset Tag */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-950/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-zinc-100 tracking-tight text-[13px]">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                {selectedTag}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
              Flameproof &quot;Ex d&quot; Flange Clearance &amp; Hydrogen (Group IIC) Temperature Class
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-500" />
            <span>Locate</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Explosion Protection Compliance Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Flameproof Joint Gap Meter */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Ex d Flameproof Joint Gap
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                  isGapSafe
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {isGapSafe ? `+${gapMarginPercent}% Margin` : 'GAP EXCEEDED'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">
                {currentGap.toFixed(2)} mm
              </span>
              <span className="text-xs text-slate-500 font-mono">max allowable: {allowableJointGapMm} mm</span>
            </div>
            {/* Visual Gap Gauge Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isGapSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, (currentGap / 0.20) * 100)}%` }}
              />
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400 flex justify-between">
              <span>0.00 mm</span>
              <span className="text-amber-500 font-semibold">Limit: 0.15 mm</span>
              <span>0.20 mm</span>
            </div>
          </div>

          {/* T-Class Thermal Bar */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">
                T-Class Surface Temperature
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                +{thermalMarginC}&deg;C Margin
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">
                {measuredSurfaceTempC}&deg;C
              </span>
              <span className="text-xs text-slate-500 font-mono">{tClassRating} Limit: {tClassLimitTempC}&deg;C</span>
            </div>
            {/* Thermal Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(measuredSurfaceTempC / tClassLimitTempC) * 100}%` }}
              />
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 dark:text-zinc-400 flex justify-between">
              <span>40&deg;C Amb</span>
              <span>118.5&deg;C Measured</span>
              <span className="text-rose-500">135.0&deg;C T4</span>
            </div>
          </div>

          {/* Auto-Ignition Thermal Headroom */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Auto-Ignition (AIT) Headroom
              </span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                +{aitMarginC}&deg;C
              </span>
              <span className="text-xs text-slate-500 font-mono">safe margin</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
              Below Hydrogen (H₂) AIT: <strong>{hydrogenAitC}&deg;C</strong>
            </div>
            <div className="text-[9.5px] font-mono text-slate-400 dark:text-zinc-500">
              Group IIC (MESG &le; 0.50 mm)
            </div>
          </div>
        </div>

        {/* 3. Ingress & Certification Badging Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-sky-500" />
              <div>
                <div className="font-mono font-bold text-[11px] text-slate-900 dark:text-zinc-100">
                  INGRESS PROTECTION: {ingressProtection}
                </div>
                <div className="text-[9.5px] font-mono text-sky-600 dark:text-sky-400">
                  HERMETIC DUST &amp; HIGH-PRESSURE WATER JET TIGHT VERIFIED
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
              IEC 60529
            </span>
          </div>

          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <div>
                <div className="font-mono font-bold text-[11px] text-emerald-700 dark:text-emerald-300">
                  CERTIFICATION COMPLIANCE STAMP
                </div>
                <div className="text-[9.5px] font-mono text-emerald-600/90 dark:text-emerald-400/90">
                  {certificationStamp}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              APPROVED
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
            Hazardous Zone: <strong className="text-slate-700 dark:text-zinc-300">Class I, Zone 1, Group IIC | Gas: Hydrogen / Acetylene</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentGap(measuredJointGapMm)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors border border-slate-200 dark:border-zinc-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExportCertificate}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Ex Inspection Certificate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
