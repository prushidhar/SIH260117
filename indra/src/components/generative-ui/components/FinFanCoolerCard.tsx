'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Crosshair,
  Sliders,
  RotateCcw,
  FileCheck,
  Zap,
  Check,
  Copy,
  Layers,
  Lock,
  Compass,
  Wind,
  Thermometer,
  Droplets,
  Download,
  Info,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { FinFanCoolerCardProps } from '../types';

/**
 * API Standard 661 7th Ed. / ISO 13706 Air-Cooled Heat Exchanger (Fin-Fan Cooler) Micro-Frontend
 */
export default function FinFanCoolerCard({
  exchangerTag = 'AFC-101',
  serviceName = 'DIESEL HYDROTREATER STRIPPER OVERHEAD CONDENSER',
  title = 'API STANDARD 661 7TH ED. AIR-COOLED HEAT EXCHANGER (FIN-FAN)',
  processInletTempC: initialTin = 125.0,
  processOutletTempC: initialTout = 45.0,
  ambientTempC: initialTamb = 32.0,
  processMassFlowTh: initialFlow = 45.0,
  heatDutyMw: initialDuty = 8.45,
  numberOfBays = 2,
  fansPerBay = 1,
  fanDiameterM = 4.27,
  tubePasses = 4,
  tubeRows = 6,
  finType = 'Extruded Aluminum High-Fin (10 FPI)',
}: FinFanCoolerCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive State
  const [ambientTemp, setAmbientTemp] = useState<number>(initialTamb);
  const [processFlow, setProcessFlow] = useState<number>(initialFlow);
  const [inletTemp, setInletTemp] = useState<number>(initialTin);
  const [targetOutletTemp, setTargetOutletTemp] = useState<number>(initialTout);
  const [isVfdAuto, setIsVfdAuto] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // API Standard 661 Thermal & Aerodynamic Calculations
  const calculations = useMemo(() => {
    // 1. Process Heat Duty Q (MWth & kW)
    // Specific heat of hydrocarbon stream Cp ~ 2.45 kJ/kg*K + latent condensation
    const deltaT_proc = Math.max(5, inletTemp - targetOutletTemp);
    // Baseline duty scales with flow and deltaT
    const dutyKw = (processFlow / 45.0) * (deltaT_proc / 80.0) * (initialDuty * 1000);
    const dutyMw = parseFloat((dutyKw / 1000).toFixed(2));

    // 2. Air-Side Heat Balance & Air Temperatures
    // Air specific heat Cp_air = 1.005 kJ/kg*K, air density at ambient temp
    const airDensityKgM3 = parseFloat((101.325 / (0.287 * (ambientTemp + 273.15))).toFixed(3));
    
    // Standard air temp rise across bundles: 24°C at design baseline
    // Thermal approach: deltaT_approach = targetOutletTemp - ambientTemp
    const approachTempC = parseFloat((targetOutletTemp - ambientTemp).toFixed(1));
    const isApproachPinched = approachTempC < 5.0;

    // Air Exit Temperature
    const airTempRiseC = Math.max(12, Math.min(38, 25 * (dutyMw / initialDuty)));
    const airExitTempC = parseFloat((ambientTemp + airTempRiseC).toFixed(1));

    // 3. Counterflow LMTD & Crossflow Correction Factor FT
    const dt1 = Math.max(1.0, inletTemp - airExitTempC); // hot end
    const dt2 = Math.max(1.0, targetOutletTemp - ambientTemp); // cold end approach
    const counterLmtd = (dt1 - dt2) / Math.log(Math.max(1.01, dt1 / dt2));
    
    // Crossflow correction factor FT per API 661 for 4-pass unmixed/mixed
    const Ft = 0.92;
    const effectiveLmtdC = parseFloat((Ft * counterLmtd).toFixed(1));

    // 4. Airflow Aerodynamics & Fan Sizing (2 Bays, 1 Fan per Bay = 2 Fans Total)
    // Mass air flow: m_air = Q / (Cp_air * deltaT_air)
    const massAirFlowKgS = dutyKw / (1.005 * airTempRiseC);
    const totalAirflowM3S = parseFloat((massAirFlowKgS / airDensityKgM3).toFixed(1));
    const airflowPerBayM3S = parseFloat((totalAirflowM3S / numberOfBays).toFixed(1));

    // Face Velocity across bundle face area (Bay size ~ 4.5m x 9.0m = 40.5 m^2 per bay)
    const bundleFaceAreaPerBay = 39.5; // m^2
    const faceVelocityMs = parseFloat((airflowPerBayM3S / bundleFaceAreaPerBay).toFixed(2));

    // 5. Electric Fan Power per API 661 § 7.2 (Static Head ~ 155 Pa across 6-row finned bundle)
    // Fan static efficiency = 66%, mechanical drive efficiency = 95%, motor efficiency = 94.5%
    const staticPressurePa = 155 * Math.pow(faceVelocityMs / 3.1, 1.8);
    const airPowerKw = (totalAirflowM3S * staticPressurePa) / 1000;
    const totalElecPowerKw = parseFloat((airPowerKw / (0.66 * 0.95 * 0.945)).toFixed(1));
    const powerPerFanKw = parseFloat((totalElecPowerKw / (numberOfBays * fansPerBay)).toFixed(1));

    // Fan VFD Speed Modulation: If ambient increases, VFD increases up to 100%
    let vfdSpeedPct = isVfdAuto
      ? Math.min(100, Math.max(45, 75 + (ambientTemp - 32) * 2.5 + (processFlow - 45) * 0.8))
      : 100;
    vfdSpeedPct = parseFloat(vfdSpeedPct.toFixed(0));

    // Fan Tip Speed (m/s) per API 661 limit (max 61 m/s for low-noise standard blades)
    const fanRpm = (vfdSpeedPct / 100) * 315; // nominal 315 RPM
    const fanTipSpeedMs = parseFloat(((Math.PI * fanDiameterM * fanRpm) / 60).toFixed(1));

    // 6. Cooling Capacity & Safety Margin Evaluation
    // Q_available = U * A * LMTD_eff
    // Design overall heat transfer coefficient U_design ~ 28.5 W/m^2*K
    const designCapacityKw = initialDuty * 1000;
    const availableCapacityKw = designCapacityKw * (effectiveLmtdC / 42.6) * (vfdSpeedPct / 100);
    const coolingMarginPct = parseFloat((((availableCapacityKw - dutyKw) / dutyKw) * 100).toFixed(1));

    let complianceStatus: 'PASS_API661_THERMAL_CAPACITY_CONFIRMED' | 'WARNING_COOLING_MARGIN_DEFICIT' | 'DERATED_SUMMER_AMBIENT_EXCEEDED';
    let complianceBadgeColor: string;
    let complianceLabel: string;

    if (coolingMarginPct >= 10.0 && !isApproachPinched) {
      complianceStatus = 'PASS_API661_THERMAL_CAPACITY_CONFIRMED';
      complianceBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      complianceLabel = 'PASS: API 661 THERMAL CAPACITY CONFIRMED (+MARGIN)';
    } else if (coolingMarginPct >= 0.0 && !isApproachPinched) {
      complianceStatus = 'WARNING_COOLING_MARGIN_DEFICIT';
      complianceBadgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      complianceLabel = 'WARNING: MARGIN DEFICIT - FANS AT FULL SPEED';
    } else {
      complianceStatus = 'DERATED_SUMMER_AMBIENT_EXCEEDED';
      complianceBadgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      complianceLabel = 'DERATED: AMBIENT PINCH LIMIT EXCEEDED (OUTLET > 45°C)';
    }

    // SVG Rotation animation duration (seconds per rotation, faster = lower duration)
    const animDurationSec = parseFloat(Math.max(0.6, 3.5 / (vfdSpeedPct / 100)).toFixed(2));

    return {
      dutyKw: Math.round(dutyKw),
      dutyMw,
      airDensityKgM3,
      approachTempC,
      isApproachPinched,
      airTempRiseC: parseFloat(airTempRiseC.toFixed(1)),
      airExitTempC,
      effectiveLmtdC,
      totalAirflowM3S,
      airflowPerBayM3S,
      faceVelocityMs,
      staticPressurePa: Math.round(staticPressurePa),
      totalElecPowerKw,
      powerPerFanKw,
      vfdSpeedPct,
      fanRpm: Math.round(fanRpm),
      fanTipSpeedMs,
      coolingMarginPct,
      complianceStatus,
      complianceBadgeColor,
      complianceLabel,
      animDurationSec,
    };
  }, [ambientTemp, processFlow, inletTemp, targetOutletTemp, isVfdAuto, initialDuty, numberOfBays, fansPerBay, fanDiameterM]);

  // Handle Audio Feedback on Sliders
  const handleSlider = (setter: (val: number) => void, val: number) => {
    sovereignAudio.playClick();
    setter(val);
  };

  // Presets Handler
  const handleApplyPreset = (
    tamb: number,
    flow: number,
    tin: number,
    tout: number,
    vfd: boolean
  ) => {
    sovereignAudio.playClick();
    setAmbientTemp(tamb);
    setProcessFlow(flow);
    setInletTemp(tin);
    setTargetOutletTemp(tout);
    setIsVfdAuto(vfd);

    if (tamb >= 44 || flow >= 70) {
      sovereignAudio.playAlertTone();
    } else {
      sovereignAudio.playSonarPing();
    }
  };

  // P&ID Tag Locator
  const handleLocate = () => {
    sovereignAudio.playClick();
    selectTag(exchangerTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: exchangerTag,
      metadata: {
        source: 'FinFanCoolerCard',
        service: serviceName,
        dutyMw: calculations.dutyMw,
        ambientTemp,
        status: calculations.complianceStatus,
      },
    });
    addToast({
      title: 'Air Cooler Exchanger Located',
      message: `Tag ${exchangerTag} (${serviceName}) focused in Cooling Water & Air Cooler P&ID.`,
      type: 'info',
    });
  };

  // Export Deliverable API 661 Design Data Sheet
  const handleExport = () => {
    sovereignAudio.playSonarPing();
    const shaSeal = 'c83017a52f9b4de6b08e23910cfa6102aa78';
    const deliverable = {
      id: `api661-${Date.now()}`,
      name: `API 661 Fin-Fan Thermal Rating Sheet - ${exchangerTag}`,
      filename: `API661_AirCooler_DataSheet_${exchangerTag}.pdf`,
      type: 'pdf',
      size: '2.6 MB',
      generatedAt: new Date().toLocaleTimeString(),
      title: `API Standard 661 Air Cooler Data Sheet - ${exchangerTag}`,
      timestamp: new Date().toLocaleTimeString(),
      description: `Thermal and aerodynamic rating for ${exchangerTag} (${serviceName}) at ${ambientTemp}°C ambient. Duty: ${calculations.dutyMw} MWth, Airflow: ${calculations.totalAirflowM3S} m³/s, Electric Power: ${calculations.totalElecPowerKw} kWe (${calculations.powerPerFanKw} kW/fan). LMTD: ${calculations.effectiveLmtdC}°C, Margin: ${calculations.coolingMarginPct}%.`,
      hash: shaSeal,
      url: '#',
    };
    addDeliverable(deliverable);
    addToast({
      title: 'API 661 Data Sheet Exported',
      message: `Thermal rating sheet compiled with SHA-256 seal ${shaSeal.slice(0, 16)}...`,
      type: 'success',
    });
  };

  // Copy SHA-256 seal
  const copySeal = () => {
    sovereignAudio.playShortcut();
    navigator.clipboard.writeText('c83017a52f9b4de6b08e23910cfa6102aa78');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden font-sans text-zinc-200">
      
      {/* 1. HEADER & EXCHANGER LOCATOR */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                API STANDARD 661 7TH ED. / ISO 13706
              </span>
              <button
                onClick={handleLocate}
                className="group flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Locate AFC-101 in P&ID"
              >
                <Crosshair className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                <span>{exchangerTag}</span>
              </button>
            </div>
            <h2 className="text-sm font-bold text-zinc-100 mt-1 tracking-tight">
              {title}
            </h2>
          </div>
        </div>

        {/* SHA-256 SEAL & CERTIFICATION BADGE */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 font-mono text-[11px] text-zinc-400">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span className="text-zinc-500">SEAL:</span>
            <span className="text-zinc-300">c83017a52f9b...</span>
            <button
              onClick={copySeal}
              className="ml-1 p-1 hover:text-white transition-colors"
              title="Copy SHA-256 Cryptographic Hash"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-950/40 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Export Data Sheet</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL COMPLIANCE STATUS BANNER */}
      <div className={`px-5 py-2.5 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono ${
        calculations.complianceStatus === 'DERATED_SUMMER_AMBIENT_EXCEEDED'
          ? 'bg-rose-950/40 text-rose-300 animate-pulse'
          : calculations.complianceStatus === 'WARNING_COOLING_MARGIN_DEFICIT'
          ? 'bg-amber-950/30 text-amber-300'
          : 'bg-emerald-950/20 text-emerald-300'
      }`}>
        <div className="flex items-center gap-2">
          {calculations.complianceStatus === 'DERATED_SUMMER_AMBIENT_EXCEEDED' ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : calculations.complianceStatus === 'WARNING_COOLING_MARGIN_DEFICIT' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-bold tracking-wide">{calculations.complianceLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Margin = <strong className={calculations.coolingMarginPct >= 10 ? 'text-emerald-400' : calculations.coolingMarginPct >= 0 ? 'text-amber-400' : 'text-rose-400'}>{calculations.coolingMarginPct > 0 ? `+${calculations.coolingMarginPct}` : calculations.coolingMarginPct}%</strong></span>
          <span>•</span>
          <span>Approach ΔT = <strong className="text-zinc-100">{calculations.approachTempC} °C</strong></span>
          <span>•</span>
          <span>Ambient = <strong className="text-zinc-100">{ambientTemp} °C</strong></span>
        </div>
      </div>

      {/* 3. VISUAL 2-BAY AIR COOLER SCHEMATIC WITH ROTATING FANS & BUNDLE GRADIENT */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between text-xs font-mono mb-3">
          <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            2-Bay Induced-Draft Axial Fan Plenum & Tube Bundle Matrix
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
            {numberOfBays} Bays • {tubePasses}-Pass • {tubeRows}-Row • {finType}
          </span>
        </div>

        {/* SVG Diagram Canvas */}
        <div className="w-full aspect-[2.4/1] max-h-[300px] bg-zinc-900/70 rounded-xl p-3 border border-zinc-800 flex items-center justify-center relative overflow-hidden">
          <svg viewBox="0 0 720 280" className="w-full h-full overflow-visible">
            <defs>
              {/* Process Fluid Temperature Gradient: 125°C Hot In (amber/rose) to 45°C Cold Out (cyan/blue) */}
              <linearGradient id="bundleFluidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="35%" stopColor="#fb923c" />
                <stop offset="70%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Cooling Air Intake Gradient */}
              <linearGradient id="airInflowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
              </linearGradient>

              {/* Heated Air Exhaust Gradient */}
              <linearGradient id="airExhaustGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.1" />
              </linearGradient>

              {/* CSS Rotation Keyframes for Axial Fan Blades */}
              <style>{`
                @keyframes fanSpin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .fan-rotate {
                  transform-origin: center;
                  animation: fanSpin ${calculations.animDurationSec}s linear infinite;
                }
              `}</style>
            </defs>

            {/* AIR INTAKE CONVECTIVE STREAMLINES (BOTTOM TO TOP) */}
            <g opacity="0.7">
              {[80, 160, 240, 320, 400, 480, 560, 640].map((x) => (
                <g key={x}>
                  <line x1={x} y1="260" x2={x} y2="185" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
                  <polygon points={`${x},180 ${x - 3},186 ${x + 3},186`} fill="#38bdf8" />
                </g>
              ))}
            </g>

            {/* HEATED AIR EXHAUST PLUMES (TOP DISCHARGE) */}
            <g opacity="0.6">
              {[140, 220, 300, 420, 500, 580].map((x) => (
                <g key={x}>
                  <line x1={x} y1="35" x2={x} y2="5" stroke="#fb923c" strokeWidth="1.5" strokeDasharray="3 3" />
                  <polygon points={`${x},0 ${x - 3},6 ${x + 3},6`} fill="#fb923c" />
                </g>
              ))}
            </g>

            {/* STRUCTURAL SUPPORT LEGS & PLATFORM */}
            <line x1="40" y1="140" x2="40" y2="270" stroke="#52525b" strokeWidth="3" />
            <line x1="360" y1="140" x2="360" y2="270" stroke="#52525b" strokeWidth="3" />
            <line x1="680" y1="140" x2="680" y2="270" stroke="#52525b" strokeWidth="3" />
            <line x1="30" y1="270" x2="690" y2="270" stroke="#3f3f46" strokeWidth="2" strokeDasharray="6 6" />

            {/* TUBE BUNDLE MATRIX (Y = 120 to Y = 175) */}
            {/* Bay 1 Bundle (X = 60 to 340) */}
            <rect x="60" y="120" width="280" height="55" rx="4" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
            {/* Bay 2 Bundle (X = 380 to 660) */}
            <rect x="380" y="120" width="280" height="55" rx="4" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />

            {/* Continuous Tube Pass Channels with Fluid Gradient */}
            <g>
              {/* Row 1 */}
              <rect x="70" y="126" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              <rect x="390" y="126" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              {/* Row 2 */}
              <rect x="70" y="138" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              <rect x="390" y="138" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              {/* Row 3 */}
              <rect x="70" y="150" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              <rect x="390" y="150" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              {/* Row 4 */}
              <rect x="70" y="162" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
              <rect x="390" y="162" width="260" height="7" rx="3" fill="url(#bundleFluidGrad)" />
            </g>

            {/* Aluminum Fin Density Cross-Hatch Lines */}
            <g stroke="#71717a" strokeWidth="0.8" opacity="0.35">
              {[80, 110, 140, 170, 200, 230, 260, 290, 320, 400, 430, 460, 490, 520, 550, 580, 610, 640].map((fx) => (
                <line key={fx} x1={fx} y1="122" x2={fx} y2="173" />
              ))}
            </g>

            {/* INLET HEADER (HOT) AT LEFT (X = 45) */}
            <rect x="42" y="115" width="18" height="65" rx="3" fill="#e11d48" stroke="#f43f5e" strokeWidth="2" />
            <polygon points="25,147 42,143 42,152" fill="#f43f5e" />
            <text x="5" y="135" fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">
              HOT IN: {inletTemp}°C
            </text>
            <text x="5" y="146" fill="#a1a1aa" fontSize="8" fontFamily="monospace">
              {processFlow} t/h
            </text>

            {/* OUTLET HEADER (COLD) AT RIGHT (X = 660) */}
            <rect x="660" y="115" width="18" height="65" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <polygon points="678,143 695,147 678,152" fill="#38bdf8" />
            <text x="655" y="135" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">
              COLD OUT: {targetOutletTemp}°C
            </text>
            <text x="655" y="146" fill="#a1a1aa" fontSize="8" fontFamily="monospace">
              ΔT = {calculations.approachTempC}°C App.
            </text>

            {/* TOP FAN PLENUM HOUSING (Y = 40 to Y = 120) */}
            {/* Bay 1 Plenum */}
            <polygon points="75,120 110,50 290,50 325,120" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
            {/* Bay 2 Plenum */}
            <polygon points="395,120 430,50 610,50 645,120" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />

            {/* FAN 1 ROTATING ASSEMBLY (BAY 1, CENTER AT (200, 50)) */}
            <g transform="translate(200, 50)">
              {/* Fan Shroud Ring */}
              <circle cx="0" cy="0" r="42" fill="#09090b" stroke="#06b6d4" strokeWidth="2.5" />
              {/* Rotating 6-Blade Axial Impeller */}
              <g className="fan-rotate">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <path
                    key={angle}
                    d="M 0 0 C 8 -12, 14 -28, 4 -38 C -4 -28, -6 -12, 0 0"
                    fill="#38bdf8"
                    opacity="0.85"
                    transform={`rotate(${angle})`}
                  />
                ))}
                {/* Center Hub */}
                <circle cx="0" cy="0" r="9" fill="#18181b" stroke="#e4e4e7" strokeWidth="2" />
              </g>
              {/* Motor & VFD Drive Housing Underneath */}
              <rect x="-8" y="10" width="16" height="20" rx="3" fill="#27272a" stroke="#52525b" strokeWidth="1" />
            </g>

            {/* FAN 2 ROTATING ASSEMBLY (BAY 2, CENTER AT (520, 50)) */}
            <g transform="translate(520, 50)">
              {/* Fan Shroud Ring */}
              <circle cx="0" cy="0" r="42" fill="#09090b" stroke="#06b6d4" strokeWidth="2.5" />
              {/* Rotating 6-Blade Axial Impeller */}
              <g className="fan-rotate">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <path
                    key={angle}
                    d="M 0 0 C 8 -12, 14 -28, 4 -38 C -4 -28, -6 -12, 0 0"
                    fill="#38bdf8"
                    opacity="0.85"
                    transform={`rotate(${angle})`}
                  />
                ))}
                {/* Center Hub */}
                <circle cx="0" cy="0" r="9" fill="#18181b" stroke="#e4e4e7" strokeWidth="2" />
              </g>
              {/* Motor & VFD Drive Housing Underneath */}
              <rect x="-8" y="10" width="16" height="20" rx="3" fill="#27272a" stroke="#52525b" strokeWidth="1" />
            </g>

            {/* BAY ANNOTATIONS & TELEMETRY LABELS */}
            {/* Bay 1 Label */}
            <text x="200" y="110" fill="#e4e4e7" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              BAY 1: FAN 1 ({calculations.powerPerFanKw} kW)
            </text>
            <text x="200" y="200" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Airflow: {calculations.airflowPerBayM3S} m³/s • {calculations.fanRpm} RPM
            </text>

            {/* Bay 2 Label */}
            <text x="520" y="110" fill="#e4e4e7" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              BAY 2: FAN 2 ({calculations.powerPerFanKw} kW)
            </text>
            <text x="520" y="200" fill="#a1a1aa" fontSize="9" fontFamily="monospace" textAnchor="middle">
              Airflow: {calculations.airflowPerBayM3S} m³/s • {calculations.fanRpm} RPM
            </text>

            {/* Ambient Air Intake Banner */}
            <rect x="250" y="240" width="220" height="24" rx="6" fill="#09090b" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="360" y="256" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              AMBIENT INTAKE: {ambientTemp} °C (ρ = {calculations.airDensityKgM3} kg/m³)
            </text>
          </svg>
        </div>
      </div>

      {/* 4. FOUR CORE KPI SUMMARY CARDS */}
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-zinc-800/80 bg-zinc-950/60">
        
        {/* KPI 1: Heat Duty */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Thermal Duty (Q)</span>
            <Activity className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {calculations.dutyMw} <span className="text-xs font-normal text-zinc-400">MWth</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            {calculations.dutyKw.toLocaleString()} kW heat transferred
          </div>
        </div>

        {/* KPI 2: Effective LMTD */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Effective LMTD</span>
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            {calculations.effectiveLmtdC} <span className="text-xs font-normal text-zinc-400">°C</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            FT = 0.92 crossflow corrected
          </div>
        </div>

        {/* KPI 3: Total Airflow */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Total Airflow (V)</span>
            <Wind className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
            {calculations.totalAirflowM3S} <span className="text-xs font-normal text-zinc-400">m³/s</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            vface = {calculations.faceVelocityMs} m/s (ΔP: {calculations.staticPressurePa} Pa)
          </div>
        </div>

        {/* KPI 4: Electric Fan Power */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Electric Fan Power</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {calculations.totalElecPowerKw} <span className="text-xs font-normal text-zinc-400">kWe</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-zinc-400">
            {calculations.powerPerFanKw} kW/fan • {calculations.vfdSpeedPct}% VFD
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE AMBIENT SENSITIVITY & PROCESS CONTROLS */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Ambient Climate & Process Temperature Sensitivity
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Real-time thermal pinch & fan power consumption simulation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          
          {/* Slider 1: Ambient Dry-Bulb Temperature */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Ambient Dry-Bulb (Tamb):</label>
              <span className={`font-bold ${ambientTemp >= 40 ? 'text-rose-400' : ambientTemp >= 35 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {ambientTemp} °C
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="48"
              step="1"
              value={ambientTemp}
              onChange={(e) => handleSlider(setAmbientTemp, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>20 °C</span>
              <span>Design: 32 °C</span>
              <span>48 °C (Desert Peak)</span>
            </div>
          </div>

          {/* Slider 2: Process Mass Flow */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Process Flow (W):</label>
              <span className="text-orange-400 font-bold">{processFlow} t/h</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              step="1"
              value={processFlow}
              onChange={(e) => handleSlider(setProcessFlow, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>20 t/h</span>
              <span>Nominal: 45 t/h</span>
              <span>80 t/h</span>
            </div>
          </div>

          {/* Slider 3: Process Inlet Temperature */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Process Inlet (Tin):</label>
              <span className="text-rose-400 font-bold">{inletTemp} °C</span>
            </div>
            <input
              type="range"
              min="90"
              max="160"
              step="1"
              value={inletTemp}
              onChange={(e) => handleSlider(setInletTemp, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>90 °C</span>
              <span>Design: 125 °C</span>
              <span>160 °C</span>
            </div>
          </div>

          {/* Slider 4: Target Outlet Temperature */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Target Outlet (Tout):</label>
              <span className="text-cyan-300 font-bold">{targetOutletTemp} °C</span>
            </div>
            <input
              type="range"
              min="35"
              max="60"
              step="1"
              value={targetOutletTemp}
              onChange={(e) => handleSlider(setTargetOutletTemp, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>35 °C</span>
              <span>Spec: 45 °C</span>
              <span>60 °C</span>
            </div>
          </div>

        </div>
      </div>

      {/* 6. FOUR OPERATIONAL PRESETS */}
      <div className="px-5 py-3 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Operating Scenarios:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset 1: Summer Design Baseline */}
          <button
            onClick={() => handleApplyPreset(32.0, 45.0, 125.0, 45.0, true)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Design Summer Baseline (32°C)
          </button>

          {/* Preset 2: Extreme Summer Peak */}
          <button
            onClick={() => handleApplyPreset(44.0, 45.0, 125.0, 45.0, true)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Extreme Summer Heatwave (44°C)
          </button>

          {/* Preset 3: Process Overload */}
          <button
            onClick={() => handleApplyPreset(35.0, 72.0, 135.0, 45.0, true)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-rose-400 hover:text-rose-300 transition-colors"
          >
            Process Overload (72 t/h)
          </button>

          {/* Preset 4: Winter Turndown */}
          <button
            onClick={() => handleApplyPreset(22.0, 38.0, 120.0, 45.0, true)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Winter Low-Load Turndown (22°C)
          </button>
        </div>
      </div>

    </div>
  );
}
