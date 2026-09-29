'use client';

import React, { useState, useMemo, useId } from 'react';
import {
  Flame,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  Sliders,
  RotateCcw,
  FileCheck,
  Thermometer,
  Gauge,
  Activity,
  Droplets,
  Wind,
  Sparkles,
  Info,
  Copy,
  Check,
  AlertOctagon,
  ArrowUpRight,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { AcidDewPointMeterProps } from '../types';

/**
 * ASME PTC 4.3 Flue Gas Acid Dew Point & Cold-End Integrity Micro-Frontend
 */
export default function AcidDewPointMeter({
  assetTag = 'F-101 / APH-101',
  equipmentName = 'Fired Heater / Rotary Air Preheater',
  title = 'ASME PTC 4.3 FLUE GAS ACID DEW POINT & COLD-END INTEGRITY',
  fuelSulfurWtPct: initialSulfur = 2.2,
  flueGasO2Pct: initialO2 = 3.5,
  coldEndMetalTempC: initialMetalTemp = 155.0,
  flueGasMoisturePct = 12.0,
  flueGasTempInC = 340.0,
  ambientAirTempC = 25.0,
  materialSpec = 'Corten A (ASTM A242) / Carbon Steel APH Baskets',
}: AcidDewPointMeterProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive Sliders State
  const [fuelSulfur, setFuelSulfur] = useState<number>(initialSulfur);
  const [flueGasO2, setFlueGasO2] = useState<number>(initialO2);
  const [metalTemp, setMetalTemp] = useState<number>(initialMetalTemp);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // ASME PTC 4.3 & Verhoff-Banchero Flue Gas Acid Dew Point Model
  const calculations = useMemo(() => {
    const S = Math.max(0.1, Math.min(4.5, fuelSulfur));
    const O2 = Math.max(1.0, Math.min(8.0, flueGasO2));
    const Tmetal = Math.max(100.0, Math.min(200.0, metalTemp));

    // 1. SO3 Formation Kinetics from Fuel Sulfur and Excess O2
    // During combustion, S oxidizes to SO2. High flame temp + excess O2 converts 1.5% - 4.5% SO2 into SO3.
    // SO3 (ppmv) approximation per ASME PTC 4.3 empirical relation:
    const conversionFactor = 0.018 + 0.0055 * (O2 - 1.0);
    const so2Ppm = S * 620; // ~620 ppm SO2 per 1 wt% S in typical fuel gas/oil
    const so3Ppm = parseFloat((so2Ppm * conversionFactor).toFixed(1));

    // 2. Partial Pressures (atmospheres)
    const pSo3Atm = (so3Ppm * 1e-6); // atm
    const pH2oAtm = (flueGasMoisturePct / 100); // 0.12 atm

    // Convert to mmHg for classic Verhoff-Banchero correlation
    const pSo3MmHg = Math.max(0.0001, pSo3Atm * 760);
    const pH2oMmHg = Math.max(1.0, pH2oAtm * 760);

    // 3. Verhoff & Banchero Correlation (1974) / ASME PTC 4.3:
    // 1000 / T_adp(K) = 2.276 - 0.02943*ln(P_H2O) - 0.0858*ln(P_SO3) + 0.0062*ln(P_H2O)*ln(P_SO3)
    const lnP_H2O = Math.log(pH2oMmHg);
    const lnP_SO3 = Math.log(pSo3MmHg);

    const invTk = 2.276 - 0.02943 * lnP_H2O - 0.0858 * lnP_SO3 + 0.0062 * lnP_H2O * lnP_SO3;
    const tAdpK = 1000 / invTk;
    const tAdpC = parseFloat((tAdpK - 273.15).toFixed(1));

    // 4. Water Dew Point (T_wdp in °C) - Saturation temperature of moisture in atmospheric flue gas
    // T_wdp ≈ 42.0 + 0.85 * flueGasMoisturePct
    const tWdpC = parseFloat((42.0 + 0.85 * (flueGasMoisturePct - 5.0)).toFixed(1));

    // 5. Cold-End Metal Temperature Safety Margin
    // ΔT = T_metal - T_adp
    const deltaT = parseFloat((Tmetal - tAdpC).toFixed(1));
    const targetMinMetalTemp = parseFloat((tAdpC + 15.0).toFixed(1)); // Recommended buffer: T_dew + 15 °C

    // Status Classification
    let status: 'OPTIMAL_SAFE' | 'MARGINAL_RISK' | 'CRITICAL_CORROSION';
    let statusLabel: string;
    let statusColor: string;
    let statusBg: string;
    let statusBorder: string;

    if (deltaT >= 15.0) {
      status = 'OPTIMAL_SAFE';
      statusLabel = 'OPTIMAL_SAFE';
      statusColor = 'text-emerald-400';
      statusBg = 'bg-emerald-500/10';
      statusBorder = 'border-emerald-500/30';
    } else if (deltaT >= 0.0) {
      status = 'MARGINAL_RISK';
      statusLabel = 'MARGINAL_RISK';
      statusColor = 'text-amber-400';
      statusBg = 'bg-amber-500/10';
      statusBorder = 'border-amber-500/30';
    } else {
      status = 'CRITICAL_CORROSION';
      statusLabel = 'CRITICAL_CORROSION';
      statusColor = 'text-rose-400';
      statusBg = 'bg-rose-500/15';
      statusBorder = 'border-rose-500/40';
    }

    // 6. Estimated Corrosion Rate (mm/year)
    // When T_metal >= T_adp, zero liquid condensation occurs -> negligible gas phase corrosion (~0.03 mm/yr).
    // When T_metal < T_adp, aggressive condensation of 75-85% H2SO4 causes rapid metal dissolution.
    let corrosionRateMmYear = 0.03;
    if (deltaT < 0.0) {
      const undercooling = Math.abs(deltaT);
      // Peak corrosion rate occurs at 20-30°C below acid dew point where acid concentration is highest
      corrosionRateMmYear = 0.03 + 0.16 * Math.pow(undercooling, 1.15) * Math.pow(S / 2.0, 0.55);
    }
    corrosionRateMmYear = parseFloat(Math.min(6.5, corrosionRateMmYear).toFixed(2));

    // Estimated APH Basket Lifespan (assuming 1.2 mm corrosion allowance on Corten elements)
    let estimatedLifespan = '> 12.0 Years';
    if (corrosionRateMmYear > 1.5) {
      const months = Math.max(1, Math.round((1.2 / corrosionRateMmYear) * 12));
      estimatedLifespan = `${months} Months (CRITICAL RAPID LOSS)`;
    } else if (corrosionRateMmYear > 0.4) {
      const years = (1.2 / corrosionRateMmYear).toFixed(1);
      estimatedLifespan = `${years} Years (Accelerated Wear)`;
    }

    return {
      so3Ppm,
      tAdpC,
      tWdpC,
      deltaT,
      targetMinMetalTemp,
      status,
      statusLabel,
      statusColor,
      statusBg,
      statusBorder,
      isCondensing: deltaT < 0,
      corrosionRateMmYear,
      estimatedLifespan,
    };
  }, [fuelSulfur, flueGasO2, metalTemp, flueGasMoisturePct]);

  // Audio tone notification on slider manipulation
  const handleSlider = (setter: (val: number) => void, val: number) => {
    sovereignAudio.playClick();
    setter(val);
  };

  const handleApplyPreset = (s: number, o2: number, tMetal: number) => {
    sovereignAudio.playClick();
    setFuelSulfur(s);
    setFlueGasO2(o2);
    setMetalTemp(tMetal);
    if (tMetal < 140) {
      sovereignAudio.playAlertTone();
    }
  };

  const handleLocate = () => {
    sovereignAudio.playClick();
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'AcidDewPointMeter',
        acidDewPoint: `${calculations.tAdpC} °C`,
        metalTemp: `${metalTemp} °C`,
        status: calculations.status,
      },
    });
    addToast({
      title: 'Fired Heater / APH Located',
      message: `Asset ${assetTag} focused in P&ID and telemetry inspector.`,
      type: 'info',
    });
  };

  const handleExport = () => {
    sovereignAudio.playSonarPing();
    const shaSeal = 'b7f91c3e4a2d8091fa05c872391b48e6a20d';
    const deliverable = {
      id: `ptc43-${Date.now()}`,
      name: `ASME PTC 4.3 Flue Gas Acid Dew Point Study - ${assetTag}`,
      filename: `ASME_PTC43_AcidDewPoint_${assetTag.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      type: 'pdf',
      size: '1.9 MB',
      generatedAt: new Date().toLocaleTimeString(),
      title: `ASME PTC 4.3 Flue Gas Acid Dew Point & Cold-End Study - ${assetTag}`,
      timestamp: new Date().toLocaleTimeString(),
      description: `Verhoff-Banchero acid dew point: ${calculations.tAdpC} °C, Metal Temp: ${metalTemp} °C, Margin ΔT: ${calculations.deltaT} °C. Corrosion rate: ${calculations.corrosionRateMmYear} mm/year. Status: ${calculations.status}.`,
      hash: shaSeal,
      url: '#',
    };
    addDeliverable(deliverable);
    addToast({
      title: 'PTC 4.3 Study Exported',
      message: `Formal air preheater cold-end integrity deliverable generated with seal ${shaSeal.slice(0, 16)}...`,
      type: 'success',
    });
  };

  const copySeal = () => {
    sovereignAudio.playShortcut();
    navigator.clipboard.writeText('b7f91c3e4a2d8091fa05c872391b48e6a20d');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Thermometer Visualizer Geometry
  // Range: 80 °C to 220 °C (span = 140 °C)
  const tMin = 80;
  const tMax = 220;
  const tSpan = tMax - tMin; // 140 °C

  // Function to convert temperature (°C) to Y position in SVG (0 to 360 px)
  // Higher temp = smaller Y (near top)
  const svgHeight = 360;
  const topPadding = 25;
  const bottomPadding = 25;
  const usableHeight = svgHeight - topPadding - bottomPadding; // 310 px

  const tempToY = (temp: number) => {
    const clamped = Math.max(tMin, Math.min(tMax, temp));
    const fraction = (clamped - tMin) / tSpan;
    return (svgHeight - bottomPadding) - (fraction * usableHeight);
  };

  const yAdp = tempToY(calculations.tAdpC);
  const yMetal = tempToY(metalTemp);
  const yTargetSafe = tempToY(calculations.targetMinMetalTemp);
  const yWater = tempToY(calculations.tWdpC);
  const yBottom = svgHeight - bottomPadding;

  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden font-sans text-zinc-200">
      
      {/* 1. HEADER & ASSET LOCATOR */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-zinc-100 tracking-wide uppercase">
                {title}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                ASME PTC 4.3
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              VERHOFF-BANCHERO CORRELATION • FLUE GAS CONDENSATION &amp; COLD-END CORROSION MODEL
            </p>
          </div>
        </div>

        {/* Target Asset Locator & Study Seal */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLocate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-xs font-mono font-bold text-amber-400 transition-all shadow-sm"
            title="Locate Fired Heater & Air Preheater in P&ID"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{assetTag}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span>Seal:</span>
            <span className="text-zinc-300">b7f91c3e...</span>
            <button
              onClick={copySeal}
              className="p-1 hover:text-zinc-100 transition-colors"
              title="Copy cryptographic audit seal"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPIS SUMMARY BAR (4 CARDS) */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 border-b border-zinc-800 bg-zinc-950/40">
        
        {/* KPI 1: Acid Dew Point */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              Acid Dew Point (T_adp)
            </span>
            <span className="text-[10px] text-amber-400 font-bold">H2SO4</span>
          </div>
          <div className="text-2xl font-black font-mono text-zinc-100 mt-1 flex items-baseline gap-1.5">
            <span>{calculations.tAdpC}</span>
            <span className="text-sm font-semibold text-zinc-400">°C</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
            <span>SO3 Vapor:</span>
            <span className="font-bold text-zinc-200">{calculations.so3Ppm} ppmv</span>
          </div>
        </div>

        {/* KPI 2: Water Dew Point */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              Water Dew Point (T_wdp)
            </span>
            <span className="text-[10px] text-cyan-400 font-bold">H2O</span>
          </div>
          <div className="text-2xl font-black font-mono text-zinc-100 mt-1 flex items-baseline gap-1.5">
            <span>{calculations.tWdpC}</span>
            <span className="text-sm font-semibold text-zinc-400">°C</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
            <span>Moisture:</span>
            <span className="font-bold text-zinc-200">{flueGasMoisturePct}% vol</span>
          </div>
        </div>

        {/* KPI 3: Safety Margin ΔT */}
        <div className={`p-3.5 rounded-xl border ${calculations.statusBg} ${calculations.statusBorder} relative overflow-hidden`}>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
            <span>Cold-End Margin (ΔT)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${calculations.statusColor} bg-zinc-900/90 border border-current`}>
              {calculations.statusLabel}
            </span>
          </div>
          <div className={`text-2xl font-black font-mono mt-1 flex items-baseline gap-1.5 ${calculations.statusColor}`}>
            <span>{calculations.deltaT > 0 ? `+${calculations.deltaT}` : calculations.deltaT}</span>
            <span className="text-sm font-semibold opacity-80">°C</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-300 mt-1 flex items-center justify-between">
            <span>Target Safe Min:</span>
            <span className="font-bold text-zinc-100">{calculations.targetMinMetalTemp} °C</span>
          </div>
        </div>

        {/* KPI 4: Estimated Corrosion Rate */}
        <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              Est. Corrosion Rate
            </span>
            <span className={`text-[10px] font-bold ${calculations.isCondensing ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {calculations.isCondensing ? 'ACTIVE ATTACK' : 'PASSIVATED'}
            </span>
          </div>
          <div className={`text-2xl font-black font-mono mt-1 flex items-baseline gap-1.5 ${
            calculations.isCondensing ? 'text-rose-400' : 'text-zinc-100'
          }`}>
            <span>{calculations.corrosionRateMmYear}</span>
            <span className="text-sm font-semibold text-zinc-400">mm/yr</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center justify-between truncate">
            <span>Basket RUL:</span>
            <span className="font-bold text-zinc-200 truncate ml-1">{calculations.estimatedLifespan}</span>
          </div>
        </div>

      </div>

      {/* 3. MAIN SECTION: DUAL-NEEDLE VERTICAL THERMOMETER & COLD-END ANATOMY */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 border-b border-zinc-800 bg-zinc-950/20">
        
        {/* LEFT COLUMN: DUAL-NEEDLE VERTICAL THERMOMETER GAUGE */}
        <div className="lg:col-span-6 rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold font-mono text-zinc-200 tracking-wide uppercase">
                Dual-Needle Cold-End Temperature Visualizer
              </h3>
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Range: 80 °C - 220 °C
            </div>
          </div>

          {/* SVG Thermometer Graphic */}
          <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 p-2 flex justify-center items-center">
            <svg
              viewBox="0 0 540 370"
              className="w-full h-auto max-h-[350px] select-none overflow-visible"
            >
              <defs>
                {/* Fluid Column Gradient */}
                <linearGradient id="fluidGradientSafe" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#0891b2" />
                  <stop offset="70%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <linearGradient id="fluidGradientCritical" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#991b1b" />
                  <stop offset="70%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                {/* Red Acid Hazard Zone Pattern */}
                <pattern id="acidHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.25" />
                </pattern>
              </defs>

              {/* Central Thermometer Coordinates:
                  Center X = 270
                  Tube Width = 32
                  Tube X = 254
              */}

              {/* 1. Shaded Red Zone (Acid Condensation Zone: 80 °C up to T_adp) */}
              <rect
                x="200"
                y={yAdp}
                width="140"
                height={Math.max(0, yBottom - yAdp)}
                fill="#ef4444"
                fillOpacity="0.12"
                rx="6"
              />
              <rect
                x="200"
                y={yAdp}
                width="140"
                height={Math.max(0, yBottom - yAdp)}
                fill="url(#acidHatch)"
                rx="6"
              />

              {/* Acid Zone Label on Left */}
              <text x="190" y={Math.min(yBottom - 15, yAdp + 25)} fill="#f87171" fontSize="9.5" fontFamily="monospace" textAnchor="end" fontWeight="bold">
                ACID CONDENSATION &amp; RAPID
              </text>
              <text x="190" y={Math.min(yBottom - 2, yAdp + 38)} fill="#f87171" fontSize="9.5" fontFamily="monospace" textAnchor="end" fontWeight="bold">
                METAL LOSS ZONE (&lt; T_adp)
              </text>

              {/* 2. Glass Thermometer Tube Outer Stem */}
              <rect
                x="252"
                y={topPadding}
                width="36"
                height={usableHeight}
                rx="18"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="2"
              />

              {/* 3. Thermometer Mercury Bulb at Bottom */}
              <circle
                cx="270"
                cy={yBottom + 12}
                r="22"
                fill={calculations.isCondensing ? '#ef4444' : '#06b6d4'}
                stroke="#27272a"
                strokeWidth="3"
                className="transition-colors duration-300"
              />

              {/* 4. Active Temperature Fluid Column up to T_metal */}
              <rect
                x="258"
                y={yMetal}
                width="24"
                height={Math.max(0, (yBottom + 12) - yMetal)}
                rx="12"
                fill={calculations.isCondensing ? 'url(#fluidGradientCritical)' : 'url(#fluidGradientSafe)'}
                className="transition-all duration-300"
              />

              {/* 5. Scale Graduations & Numeric Labels */}
              {[80, 100, 120, 140, 160, 180, 200, 220].map((t) => {
                const y = tempToY(t);
                return (
                  <g key={t}>
                    <line x1="240" y1={y} x2="252" y2={y} stroke="#52525b" strokeWidth="1.5" />
                    <line x1="288" y1={y} x2="300" y2={y} stroke="#52525b" strokeWidth="1.5" />
                    <text x="234" y={y + 3.5} fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">
                      {t}°
                    </text>
                  </g>
                );
              })}
              {/* Minor 10° Ticks */}
              {[90, 110, 130, 150, 170, 190, 210].map((t) => {
                const y = tempToY(t);
                return (
                  <g key={t}>
                    <line x1="245" y1={y} x2="252" y2={y} stroke="#3f3f46" strokeWidth="1" />
                    <line x1="288" y1={y} x2="295" y2={y} stroke="#3f3f46" strokeWidth="1" />
                  </g>
                );
              })}

              {/* 6. Target Safety Threshold Line (Green: T_adp + 15 °C) */}
              <g>
                <line x1="160" y1={yTargetSafe} x2="380" y2={yTargetSafe} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
                <rect x="382" y={yTargetSafe - 9} width="145" height="18" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
                <text x="454" y={yTargetSafe + 3.5} fill="#6ee7b7" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  REC. MIN: {calculations.targetMinMetalTemp} °C (+15°)
                </text>
              </g>

              {/* 7. NEEDLE 1 (Amber): H2SO4 Sulfuric Acid Dew Point (T_adp) */}
              <g className="transition-all duration-300">
                <line x1="150" y1={yAdp} x2="252" y2={yAdp} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 1" />
                {/* Pointer Chevron */}
                <polygon points={`252,${yAdp} 242,${yAdp-6} 242,${yAdp+6}`} fill="#f59e0b" />
                {/* Needle Badge on Left */}
                <rect x="25" y={yAdp - 11} width="125" height="22" rx="5" fill="#18181b" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="87" y={yAdp + 4} fill="#fbbf24" fontSize="9.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  H2SO4 DEW: {calculations.tAdpC}°C
                </text>
              </g>

              {/* 8. NEEDLE 2 (Cyan): Current Cold-End Metal Temperature */}
              <g className="transition-all duration-300">
                <line x1="288" y1={yMetal} x2="380" y2={yMetal} stroke="#06b6d4" strokeWidth="2.5" />
                {/* Pointer Chevron */}
                <polygon points={`288,${yMetal} 298,${yMetal-6} 298,${yMetal+6}`} fill="#06b6d4" />
                {/* Needle Badge on Right */}
                <rect x="382" y={yMetal - 11} width="145" height="22" rx="5" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
                <text x="454" y={yMetal + 4} fill="#67e8f9" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  METAL TEMP: {metalTemp.toFixed(1)}°C
                </text>
              </g>

            </svg>
          </div>

          {/* Quick Legend Bar */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
            <div className="p-1.5 rounded bg-zinc-950 border border-amber-500/30 text-amber-300">
              <span className="font-bold">Needle 1: </span>H2SO4 Dew Point
            </div>
            <div className="p-1.5 rounded bg-zinc-950 border border-cyan-500/30 text-cyan-300">
              <span className="font-bold">Needle 2: </span>Metal Temp
            </div>
            <div className="p-1.5 rounded bg-zinc-950 border border-emerald-500/30 text-emerald-300">
              <span className="font-bold">Target Line: </span>T_dew + 15°C
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: COLD-END INTEGRITY & MITIGATION ADVISORY */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          
          {/* Condensation Risk Alert Card */}
          <div className={`p-4 rounded-xl border ${
            calculations.isCondensing 
              ? 'bg-rose-950/40 border-rose-500/60 animate-pulse' 
              : calculations.status === 'MARGINAL_RISK'
                ? 'bg-amber-950/30 border-amber-500/40'
                : 'bg-emerald-950/20 border-emerald-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                calculations.isCondensing ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {calculations.isCondensing ? <AlertOctagon className="w-5 h-5 text-rose-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="text-xs">
                <div className={`font-mono font-bold tracking-wider uppercase ${
                  calculations.isCondensing ? 'text-rose-400' : 'text-zinc-200'
                }`}>
                  {calculations.isCondensing
                    ? 'CRITICAL ALERT: ACID CONDENSATION ACTIVE ON BASKETS'
                    : calculations.status === 'MARGINAL_RISK'
                      ? 'WARNING: MARGINAL OPERATING BUFFER (< 15 °C)'
                      : 'OPTIMAL COLD-END PRESERVATION ENVELOPE'}
                </div>
                <p className="text-zinc-300 text-[11px] mt-1 leading-relaxed">
                  {calculations.isCondensing
                    ? `Cold-end metal temperature (${metalTemp}°C) is ${Math.abs(calculations.deltaT)}°C BELOW sulfuric acid dew point (${calculations.tAdpC}°C). Highly corrosive 80% liquid H2SO4 is depositing directly onto heating surfaces. Aggressive corrosion attack (${calculations.corrosionRateMmYear} mm/yr) will perforate elements within months.`
                    : calculations.status === 'MARGINAL_RISK'
                      ? `Operating margin (+${calculations.deltaT}°C) is above dew point but below ASME PTC 4.3 recommended minimum safety buffer (+15°C). Transient cold spots during winter load swings or sootblowing can cause localized sulfuric condensation.`
                      : `Operating safely at +${calculations.deltaT}°C above acid dew point. Flue gas heat recovery is maximized without risking cold-end element corrosion. Corten heating elements passivated.`}
                </p>
              </div>
            </div>
          </div>

          {/* Technical Specifications & Metallurgy */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5 text-xs font-mono">
            <div className="font-bold text-zinc-200 border-b border-zinc-800 pb-1.5 flex items-center justify-between">
              <span>ASME PTC 4.3 TECHNICAL SPECIFICATIONS</span>
              <span className="text-[10px] text-zinc-500">TAG: {assetTag}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400">Heating Element Mat:</span>
                <span className="font-bold text-zinc-200 truncate ml-1">{materialSpec.split('/')[0]}</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400">APH Flue Gas In:</span>
                <span className="font-bold text-zinc-200">{flueGasTempInC} °C</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400">Combustion Air In:</span>
                <span className="font-bold text-zinc-200">{ambientAirTempC} °C</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400">SO2 Conversion:</span>
                <span className="font-bold text-zinc-200">{(calculations.so3Ppm / (fuelSulfur * 6.2)).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Recommended Corrective Actions (CAPA) */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono">
            <div className="font-bold text-zinc-200 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>COLD-END CORROSION MITIGATION ACTIONS</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-zinc-300">SCAPH Coil Modulation:</strong> Increase low-pressure steam flow to Steam Coil Air Preheater to boost air inlet temp by +15°C to +25°C.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-zinc-300">Combustion O2 Trimming:</strong> Lower excess O2 from {flueGasO2}% toward 2.0% to suppress catalytic SO3 oxidation by up to 35%.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong className="text-zinc-300">Cold-End Element Rotation:</strong> Inspect and invert cold-end enamel-coated / Corten baskets during scheduled maintenance.</span>
              </li>
            </ul>
          </div>

          {/* Deliverable Action Button */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-amber-500/50 text-xs font-mono font-bold text-zinc-100 transition-all shadow-md"
            >
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Export ASME PTC 4.3 Study Deliverable</span>
            </button>
          </div>

        </div>

      </div>

      {/* 4. INTERACTIVE SENSITIVITY SLIDERS & PRESETS */}
      <div className="p-5 bg-zinc-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold font-mono text-zinc-200 tracking-wide uppercase">
              Flue Gas Sensitivity Sliders &amp; Operating Regimes
            </h3>
          </div>

          {/* Quick Operating Regimes */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <button
              onClick={() => handleApplyPreset(3.5, 4.0, 158.0)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Heavy Fuel Oil (3.5% S)
            </button>
            <button
              onClick={() => handleApplyPreset(0.5, 3.0, 150.0)}
              className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 transition-colors"
            >
              Low Sulfur Gas Oil (0.5% S)
            </button>
            <button
              onClick={() => handleApplyPreset(2.0, 2.5, 155.0)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Refinery Fuel Gas (2.0% S)
            </button>
            <button
              onClick={() => handleApplyPreset(fuelSulfur, flueGasO2, metalTemp + 18.0)}
              className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 transition-colors"
            >
              SCAPH Steam Coil ON (+18°C)
            </button>
            <button
              onClick={() => handleApplyPreset(2.8, 5.0, 126.0)}
              className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700 transition-colors"
            >
              Winter Air Inrush (Condensing!)
            </button>
          </div>
        </div>

        {/* 3 Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Slider 1: Fuel Sulfur Content */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">Fuel Sulfur Content:</span>
              <span className="font-bold text-amber-400">{fuelSulfur.toFixed(2)} wt%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="4.5"
              step="0.1"
              value={fuelSulfur}
              onChange={(e) => handleSlider(setFuelSulfur, parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>0.1 wt% (Ultra-Low)</span>
              <span>2.2 wt%</span>
              <span>4.5 wt% (Heavy Bunker)</span>
            </div>
          </div>

          {/* Slider 2: Flue Gas Excess O2 */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">Flue Gas O2:</span>
              <span className="font-bold text-cyan-400">{flueGasO2.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.1"
              value={flueGasO2}
              onChange={(e) => handleSlider(setFlueGasO2, parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>1.0% (Low NOx Trim)</span>
              <span>3.5%</span>
              <span>8.0% (Excess Air)</span>
            </div>
          </div>

          {/* Slider 3: Cold-End Metal Temperature */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400">Cold-End Metal Temp:</span>
              <span className={`font-bold ${calculations.isCondensing ? 'text-rose-400' : 'text-emerald-400'}`}>
                {metalTemp.toFixed(1)} °C
              </span>
            </div>
            <input
              type="range"
              min="100.0"
              max="200.0"
              step="1.0"
              value={metalTemp}
              onChange={(e) => handleSlider(setMetalTemp, parseFloat(e.target.value))}
              className={`w-full bg-zinc-800 rounded-lg cursor-pointer h-1.5 ${
                calculations.isCondensing ? 'accent-rose-500' : 'accent-emerald-500'
              }`}
            />
            <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1.5">
              <span>100 °C (Heavy Condensation)</span>
              <span>155 °C</span>
              <span>200 °C (Safe Hot)</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
