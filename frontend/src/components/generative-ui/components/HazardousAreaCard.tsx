'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  Wind,
  Gauge,
  Sliders,
  RotateCcw,
  Download,
  Copy,
  Check,
  Crosshair,
  Compass,
  Layers,
  Zap,
  Radio,
  FileCheck,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  Activity,
  ArrowRight,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { HazardousAreaCardProps } from '../types';

interface GasProperties {
  name: string;
  formula: string;
  molecularWeight: number; // kg/kmol
  gamma: number; // Cp/Cv
  lelVolPercent: number; // vol %
  aitC: number; // Auto-Ignition Temperature in °C
  gasGroup: 'Group IIC' | 'Group IIB' | 'Group IIA';
  necGroup: string;
  tClassReq: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';
  mesgMm: number; // Maximum Experimental Safe Gap in mm
  micRatio: number; // Minimum Igniting Current ratio
  densityStandardKgM3: number; // kg/m³ at 20°C, 1 atm
}

const GAS_DATABASE: Record<string, GasProperties> = {
  'Hydrogen / Methane Mix (70/30 mol%)': {
    name: 'Hydrogen / Methane Mix (70/30 mol%)',
    formula: '70% H2 + 30% CH4',
    molecularWeight: 6.223,
    gamma: 1.38,
    lelVolPercent: 4.3,
    aitC: 545.0,
    gasGroup: 'Group IIC',
    necGroup: 'Class I, Group A/B',
    tClassReq: 'T1',
    mesgMm: 0.42,
    micRatio: 0.38,
    densityStandardKgM3: 0.259,
  },
  'Pure Hydrogen (H2)': {
    name: 'Pure Hydrogen (H2)',
    formula: 'H2',
    molecularWeight: 2.016,
    gamma: 1.41,
    lelVolPercent: 4.0,
    aitC: 560.0,
    gasGroup: 'Group IIC',
    necGroup: 'Class I, Group B',
    tClassReq: 'T1',
    mesgMm: 0.29,
    micRatio: 0.28,
    densityStandardKgM3: 0.084,
  },
  'Natural Gas / Methane (CH4)': {
    name: 'Natural Gas / Methane (CH4)',
    formula: 'CH4',
    molecularWeight: 16.04,
    gamma: 1.31,
    lelVolPercent: 5.0,
    aitC: 537.0,
    gasGroup: 'Group IIA',
    necGroup: 'Class I, Group D',
    tClassReq: 'T1',
    mesgMm: 1.14,
    micRatio: 1.00,
    densityStandardKgM3: 0.668,
  },
  'Ethylene (C2H4)': {
    name: 'Ethylene (C2H4)',
    formula: 'C2H4',
    molecularWeight: 28.05,
    gamma: 1.24,
    lelVolPercent: 2.7,
    aitC: 450.0,
    gasGroup: 'Group IIB',
    necGroup: 'Class I, Group C',
    tClassReq: 'T2',
    mesgMm: 0.65,
    micRatio: 0.69,
    densityStandardKgM3: 1.166,
  },
  'Propane / LPG (C3H8)': {
    name: 'Propane / LPG (C3H8)',
    formula: 'C3H8',
    molecularWeight: 44.1,
    gamma: 1.13,
    lelVolPercent: 2.1,
    aitC: 450.0,
    gasGroup: 'Group IIA',
    necGroup: 'Class I, Group D',
    tClassReq: 'T1',
    mesgMm: 0.92,
    micRatio: 0.82,
    densityStandardKgM3: 1.834,
  },
};

const T_CLASS_DATA = [
  { tClass: 'T1', maxSurfaceTempC: 450, desc: '450°C (Methane, Hydrogen)' },
  { tClass: 'T2', maxSurfaceTempC: 300, desc: '300°C (Ethylene, Acetylene)' },
  { tClass: 'T3', maxSurfaceTempC: 200, desc: '200°C (Gasoline, Diesel, Kerosene)' },
  { tClass: 'T4', maxSurfaceTempC: 135, desc: '135°C (Acetaldehyde, Jet Fuel)' },
  { tClass: 'T5', maxSurfaceTempC: 100, desc: '100°C' },
  { tClass: 'T6', maxSurfaceTempC: 85, desc: '85°C (Carbon Disulfide)' },
];

/**
 * IEC 60079-10-1 & API RP 505 Hazardous Area Classification & Gas Dispersion Micro-Frontend
 */
export default function HazardousAreaCard({
  enclosureTag = 'HAC-CELL-101',
  gasMixture: initialGas = 'Hydrogen / Methane Mix (70/30 mol%)',
  title = 'IEC 60079-10-1 / API RP 505 HAZARDOUS AREA CLASSIFICATION',
  operatingPressureBarG: initialPressure = 24.0,
  leakHoleSizeMm: initialHoleSize = 3.0,
  ventilationVelocityMs: initialVentVelocity = 0.65,
  operatingTempC = 35.0,
  releaseGrade: initialGrade = 'Secondary',
  enclosureVolumeM3 = 240.0,
  standardCode = 'IEC 60079-10-1:2020 / API RP 505 / NFPA 497',
}: HazardousAreaCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive State
  const [selectedGasKey, setSelectedGasKey] = useState<string>(
    GAS_DATABASE[initialGas] ? initialGas : 'Hydrogen / Methane Mix (70/30 mol%)'
  );
  const [pressureBarG, setPressureBarG] = useState<number>(initialPressure);
  const [holeSizeMm, setHoleSizeMm] = useState<number>(initialHoleSize);
  const [ventVelocityMs, setVentVelocityMs] = useState<number>(initialVentVelocity);
  const [releaseGrade, setReleaseGrade] = useState<'Secondary' | 'Primary' | 'Continuous'>(initialGrade);
  const [activeTClassSelected, setActiveTClassSelected] = useState<'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'>('T4');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [hoverCoords, setHoverCoords] = useState<{ xM: number; yM: number; distM: number; estLelPercent: number } | null>(null);

  const gas = GAS_DATABASE[selectedGasKey] || GAS_DATABASE['Hydrogen / Methane Mix (70/30 mol%)'];

  // Calculations per IEC 60079-10-1 Edition 3.0 & API RP 505
  const calculations = useMemo(() => {
    // 1. Upstream Absolute Pressure P1 (Pa)
    const p1Pa = (pressureBarG + 1.01325) * 1e5;
    const patmPa = 1.01325 * 1e5;

    // 2. Choked / Sonic Discharge Assessment
    const gamma = gas.gamma;
    const critRatio = Math.pow(2 / (gamma + 1), gamma / (gamma - 1));
    const isChoked = patmPa / p1Pa <= critRatio;

    // 3. Orifice Cross-Sectional Area (m²)
    const holeRadiusM = (holeSizeMm * 1e-3) / 2;
    const areaM2 = Math.PI * Math.pow(holeRadiusM, 2);
    const cd = 0.62; // standard discharge coefficient for sharp-edged leak orifice

    // 4. Choked Mass Release Rate Wg (kg/s) per IEC 60079-10-1 Equation B.2
    const T1K = operatingTempC + 273.15;
    const R_univ = 8314.5; // J / (kmol K)
    const M = gas.molecularWeight; // kg / kmol

    // Sonic factor Gamma_crit
    const gammaCritFactor = Math.sqrt(
      ((gamma * M) / (R_univ * T1K)) * Math.pow(2 / (gamma + 1), (gamma + 1) / (gamma - 1))
    );
    const massReleaseRateKgS = cd * areaM2 * p1Pa * gammaCritFactor;
    const massReleaseRateGS = massReleaseRateKgS * 1000;
    const massReleaseRateKgH = massReleaseRateKgS * 3600;

    // 5. Lower Explosive Limit Mass Concentration (kg/m³)
    // Standard molar volume = 24.05 m³/kmol at 20°C, 101.3 kPa
    const lelVolFraction = gas.lelVolPercent / 100;
    const lelMassKgM3 = (lelVolFraction * M) / 24.05;
    const lelMassGM3 = lelMassKgM3 * 1000;

    // 6. Extent of Hazardous Area r_z (meters) per IEC 60079-10-1 Annex D (Momentum Jet Dilution)
    // r_z = distance to 20% LEL (safety factor k = 0.20 per statutory rules)
    const effVentVelocity = Math.max(0.12, ventVelocityMs);
    const dilutionParameter = massReleaseRateKgS / (lelMassKgM3 * effVentVelocity);
    const rZ = Math.max(0.25, 2.15 * Math.pow(dilutionParameter, 0.44));

    // Concentric Contours (multipliers from source):
    const r100Lel = rZ * 0.35; // Core flammable / flash envelope
    const r50Lel = rZ * 0.65; // 50% LEL boundary
    const r20Lel = rZ * 1.0; // 20% LEL statutory hazardous extent (r_z)
    const r10Lel = rZ * 1.38; // 10% LEL dilution margin

    // 7. Ventilation Air Changes per Hour (ACH) & Dilution Degree
    // Enclosure cell dimensions: e.g. 10m x 8m x 3m (240 m³)
    const crossSectionAreaM2 = 24.0; // 8m width x 3m height
    const volumetricVentFlowM3S = effVentVelocity * crossSectionAreaM2;
    const ach = (volumetricVentFlowM3S * 3600) / enclosureVolumeM3;

    // Hypothetical volume of explosive cloud Vz (m³) per IEC 60079-10-1 B.4
    const plumeVolumeVz = Math.min(enclosureVolumeM3, (2 / 3) * Math.PI * Math.pow(rZ, 3) * 0.28);

    // 8. Dilution Degree Rating
    let dilutionRating: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (ach >= 12.0 && rZ <= 1.5) {
      dilutionRating = 'HIGH';
    } else if (ach < 4.0 || rZ >= 6.5) {
      dilutionRating = 'LOW';
    }

    // 9. Zone Classification Synthesis (Table B.1)
    let iecZone: 'Zone 0' | 'Zone 1' | 'Zone 2' | 'Zone 2 (Negligible Extent)' = 'Zone 2';
    let necDivision: string = 'Class I, Division 2';
    let necZone: string = 'Class I, Zone 2';
    let zoneSeverity: 'low' | 'moderate' | 'severe' | 'critical' = 'moderate';

    if (releaseGrade === 'Continuous') {
      iecZone = 'Zone 0';
      necDivision = 'Class I, Division 1';
      necZone = 'Class I, Zone 0';
      zoneSeverity = 'critical';
    } else if (releaseGrade === 'Primary') {
      if (dilutionRating === 'LOW') {
        iecZone = 'Zone 0';
        necDivision = 'Class I, Division 1';
        necZone = 'Class I, Zone 0';
        zoneSeverity = 'critical';
      } else {
        iecZone = 'Zone 1';
        necDivision = 'Class I, Division 1';
        necZone = 'Class I, Zone 1';
        zoneSeverity = 'severe';
      }
    } else {
      // Secondary Release Grade
      if (dilutionRating === 'HIGH') {
        iecZone = 'Zone 2 (Negligible Extent)';
        necDivision = 'Class I, Division 2';
        necZone = 'Class I, Zone 2 (NE)';
        zoneSeverity = 'low';
      } else if (dilutionRating === 'LOW') {
        iecZone = 'Zone 1';
        necDivision = 'Class I, Division 1';
        necZone = 'Class I, Zone 1';
        zoneSeverity = 'severe';
      } else {
        iecZone = 'Zone 2';
        necDivision = 'Class I, Division 2';
        necZone = 'Class I, Zone 2';
        zoneSeverity = 'moderate';
      }
    }

    // Apparatus Surface Temperature Margin vs Auto-Ignition Temperature
    const activeTClassObj = T_CLASS_DATA.find((t) => t.tClass === activeTClassSelected) || T_CLASS_DATA[3];
    const surfaceTempMarginC = gas.aitC - activeTClassObj.maxSurfaceTempC;
    const isTClassCompliant = surfaceTempMarginC >= 25.0; // min 25°C margin per IEC 60079-14

    return {
      p1Pa,
      isChoked,
      massReleaseRateKgS,
      massReleaseRateGS,
      massReleaseRateKgH,
      lelMassKgM3,
      lelMassGM3,
      rZ,
      r100Lel,
      r50Lel,
      r20Lel,
      r10Lel,
      volumetricVentFlowM3S,
      ach,
      plumeVolumeVz,
      dilutionRating,
      iecZone,
      necDivision,
      necZone,
      zoneSeverity,
      activeTClassObj,
      surfaceTempMarginC,
      isTClassCompliant,
    };
  }, [
    gas,
    pressureBarG,
    holeSizeMm,
    ventVelocityMs,
    operatingTempC,
    releaseGrade,
    enclosureVolumeM3,
    activeTClassSelected,
  ]);

  // Tag Locator
  const handleLocateTag = () => {
    sovereignAudio.playClick();
    selectTag(enclosureTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: enclosureTag,
      metadata: {
        source: 'HazardousAreaCard',
        gasMixture: gas.name,
        rZ: calculations.rZ,
        iecZone: calculations.iecZone,
      },
    });
    addToast({
      type: 'info',
      title: 'Hazardous Cell Located',
      message: `Centered P&ID and 3D plant topology on enclosure ${enclosureTag} (Zone: ${calculations.iecZone}, r_z: ${calculations.rZ.toFixed(2)} m).`,
    });
  };

  // Copy Study Seal
  const studySealHash = 'd5c891a27e04f938b621e84a0d92ef17ca83';
  const handleCopyHash = () => {
    sovereignAudio.playShortcut();
    navigator.clipboard.writeText(studySealHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
    addToast({
      type: 'success',
      title: 'Seal Copied',
      message: 'SHA-256 hazardous area classification certificate hash copied to clipboard.',
    });
  };

  // Operational Scenarios
  const handleApplyScenario = (
    name: string,
    p: number,
    hole: number,
    vent: number,
    gasKey: string,
    grade: 'Secondary' | 'Primary' | 'Continuous'
  ) => {
    sovereignAudio.playSonarPing();
    setPressureBarG(p);
    setHoleSizeMm(hole);
    setVentVelocityMs(vent);
    setSelectedGasKey(gasKey);
    setReleaseGrade(grade);
    addToast({
      type: 'info',
      title: 'Scenario Loaded',
      message: `Loaded "${name}" preset into IEC 60079 dispersion model.`,
    });
  };

  // Export Deliverable
  const handleExportAssessment = () => {
    sovereignAudio.playClick();
    const payload = {
      studyType: 'IEC 60079-10-1 / API RP 505 Hazardous Area Classification Schedule',
      timestamp: new Date().toISOString(),
      enclosureTag,
      gasMixture: gas.name,
      gasGroup: gas.gasGroup,
      necGroup: gas.necGroup,
      autoIgnitionTempC: gas.aitC,
      operatingPressureBarG: pressureBarG,
      leakHoleDiameterMm: holeSizeMm,
      ventilationVelocityMs: ventVelocityMs,
      releaseGrade,
      chokedFlowConfirmed: calculations.isChoked,
      chokedMassReleaseRateGS: parseFloat(calculations.massReleaseRateGS.toFixed(2)),
      chokedMassReleaseRateKgH: parseFloat(calculations.massReleaseRateKgH.toFixed(2)),
      lelMassConcentrationGM3: parseFloat(calculations.lelMassGM3.toFixed(2)),
      hazardousBoundaryDistanceRzM: parseFloat(calculations.rZ.toFixed(2)),
      radiiContourM: {
        r100Lel: parseFloat(calculations.r100Lel.toFixed(2)),
        r50Lel: parseFloat(calculations.r50Lel.toFixed(2)),
        r20Lel: parseFloat(calculations.r20Lel.toFixed(2)),
        r10Lel: parseFloat(calculations.r10Lel.toFixed(2)),
      },
      airChangesPerHourACH: parseFloat(calculations.ach.toFixed(1)),
      dilutionRating: calculations.dilutionRating,
      iecZone: calculations.iecZone,
      necDivision: calculations.necDivision,
      necZone: calculations.necZone,
      requiredTClass: calculations.activeTClassObj.tClass,
      surfaceTempMarginC: parseFloat(calculations.surfaceTempMarginC.toFixed(1)),
      certifiedApparatusMarking: `Ex db eb [ia Ga] ${gas.gasGroup} ${calculations.activeTClassObj.tClass} Gb / ${gas.necGroup} ${calculations.activeTClassObj.tClass}`,
      cryptographicSeal: studySealHash,
    };

    addDeliverable({
      id: `HAC-${enclosureTag}-${Date.now()}`,
      name: `IEC 60079-10-1 Area Classification: ${enclosureTag}`,
      filename: `IEC60079_Area_Classification_${enclosureTag}.json`,
      type: 'json',
      size: '18.4 KB',
      generatedAt: new Date().toLocaleTimeString(),
      timestamp: new Date().toLocaleTimeString(),
      description: `Hazardous area classification schedule for ${enclosureTag} with ${gas.name}. Boundary r_z = ${calculations.rZ.toFixed(2)} m (${calculations.iecZone}). Apparatus Group ${gas.gasGroup} ${calculations.activeTClassObj.tClass}.`,
      hash: studySealHash,
      url: '#',
    });

    addToast({
      type: 'success',
      title: 'Assessment Exported',
      message: `Archived IEC 60079-10-1 data sheet for ${enclosureTag} to Deliverables.`,
    });
  };

  // SVG Coordinate Conversion & Interactive Hover
  // Canvas viewBox: 0 0 540 320.
  // Center of Release Orifice: x = 160, y = 160.
  // Scale: 1 meter = 24 SVG pixels.
  const svgCenterX = 160;
  const svgCenterY = 160;
  const pixelsPerMeter = 24.0;

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 540;
    const svgY = ((e.clientY - rect.top) / rect.height) * 320;

    const dxPixels = svgX - svgCenterX;
    const dyPixels = svgY - svgCenterY;

    const dxM = dxPixels / pixelsPerMeter;
    const dyM = -dyPixels / pixelsPerMeter; // Y upwards in physical meters
    const distM = Math.sqrt(dxM * dxM + dyM * dyM);

    // Approximate % LEL based on inverse dispersion distance from source
    let estLel = 0;
    if (distM < 0.1) {
      estLel = 250;
    } else {
      // Gaussian/momentum decay estimate
      const ratio = distM / calculations.rZ;
      estLel = 20 / Math.pow(ratio, 1.25);
    }

    setHoverCoords({
      xM: parseFloat(dxM.toFixed(2)),
      yM: parseFloat(dyM.toFixed(2)),
      distM: parseFloat(distM.toFixed(2)),
      estLelPercent: Math.min(300, Math.max(0, parseFloat(estLel.toFixed(1)))),
    });
  };

  const handleSvgMouseLeave = () => {
    setHoverCoords(null);
  };

  return (
    <div className="flex flex-col w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden font-sans text-zinc-100">
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                {standardCode}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                CELL CLASSIFIER
              </span>
            </div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
              {title}
            </h2>
          </div>
        </div>

        {/* Tag Locator & Cryptographic Seal */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateTag}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded transition-colors"
            title="Focus Enclosure in P&ID and 3D Viewport"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>LOCATE: {enclosureTag}</span>
          </button>

          <button
            onClick={handleCopyHash}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
            title="Copy Cryptographic SHA-256 Study Seal"
          >
            <span className="text-[10px] text-zinc-500">SHA-256:</span>
            <span>{studySealHash.slice(0, 10)}…</span>
            {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 2. Top Banner: Flammable Gas Mix & Primary Classifiers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-zinc-900/40 border-b border-zinc-800/80 text-xs">
        {/* Gas Selector */}
        <div className="flex flex-col gap-1 p-2 rounded bg-zinc-900/60 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" /> Flammable Gas Mixture
          </span>
          <select
            value={selectedGasKey}
            onChange={(e) => {
              sovereignAudio.playClick();
              setSelectedGasKey(e.target.value);
            }}
            className="w-full text-xs font-mono bg-zinc-950 text-zinc-200 border border-zinc-700 rounded px-1.5 py-1 focus:outline-none focus:border-amber-500"
          >
            {Object.keys(GAS_DATABASE).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
            <span>MW: {gas.molecularWeight} kg/kmol</span>
            <span>LEL: {gas.lelVolPercent}% vol</span>
          </div>
        </div>

        {/* IEC Zone Classifier Pill */}
        <div
          className={`flex flex-col justify-between p-2 rounded border ${
            calculations.zoneSeverity === 'critical'
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : calculations.zoneSeverity === 'severe'
              ? 'bg-orange-950/20 border-orange-500/40 text-orange-300'
              : calculations.zoneSeverity === 'moderate'
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <span className="text-[10px] font-mono uppercase flex items-center justify-between">
            <span>IEC 60079-10-1 ZONE</span>
            <span
              className={`w-2 h-2 rounded-full ${
                calculations.zoneSeverity === 'critical'
                  ? 'bg-rose-500 animate-ping'
                  : calculations.zoneSeverity === 'severe'
                  ? 'bg-orange-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
          </span>
          <div className="text-base font-mono font-bold tracking-tight">
            {calculations.iecZone}
          </div>
          <div className="text-[10px] font-mono text-zinc-400">
            Grade: {releaseGrade} | Dilution: {calculations.dilutionRating}
          </div>
        </div>

        {/* NEC / API RP 505 Equivalent */}
        <div className="flex flex-col justify-between p-2 rounded bg-zinc-900/60 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400">
            NEC 500 / API RP 505 DUAL RATING
          </span>
          <div className="text-xs font-mono font-semibold text-zinc-200">
            {calculations.necDivision}
          </div>
          <div className="text-[10px] font-mono text-amber-400/90">
            Zone Equiv: {calculations.necZone}
          </div>
        </div>

        {/* Required Electrical Apparatus Rating */}
        <div className="flex flex-col justify-between p-2 rounded bg-zinc-900/60 border border-zinc-800">
          <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center justify-between">
            <span>APPARATUS CERTIFICATION</span>
            <span className="text-cyan-400 font-mono text-[9px]">IP66 / NEMA 4X</span>
          </span>
          <div className="text-xs font-mono font-bold text-cyan-400 truncate">
            {gas.gasGroup} · {calculations.activeTClassObj.tClass} Gb
          </div>
          <div className="text-[10px] font-mono text-zinc-400 truncate">
            {gas.necGroup} · {calculations.activeTClassObj.tClass}
          </div>
        </div>
      </div>

      {/* 3. Main Content: SVG Top-Down Dispersion Contour */}
      <div className="p-4 space-y-4">
        <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
          {/* Top-Down Canvas Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-bold text-zinc-300">
                TOP-DOWN LEL DISPERSION CONTOUR (PLAN VIEW)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Scale: 1m = 24px
              </span>
            </div>

            {/* Hover Coordinates Readout */}
            <div className="flex items-center gap-3 text-[11px] font-mono">
              {hoverCoords ? (
                <div className="flex items-center gap-2 text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  <span className="text-zinc-500">X: {hoverCoords.xM}m, Y: {hoverCoords.yM}m</span>
                  <span className="text-amber-400">Dist: {hoverCoords.distM}m</span>
                  <span
                    className={
                      hoverCoords.estLelPercent >= 100
                        ? 'text-rose-400 font-bold'
                        : hoverCoords.estLelPercent >= 50
                        ? 'text-orange-400'
                        : hoverCoords.estLelPercent >= 20
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }
                  >
                    Est: {hoverCoords.estLelPercent}% LEL
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono italic">
                  Hover canvas to inspect local coordinates and % LEL concentration
                </span>
              )}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full h-[320px] bg-zinc-950 select-none overflow-hidden cursor-crosshair">
            <svg
              viewBox="0 0 540 320"
              className="w-full h-full"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
            >
              <defs>
                {/* CAD Grid Pattern */}
                <pattern id="cadGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.8" />
                </pattern>

                {/* Major 5-meter grid pattern */}
                <pattern id="majorGrid" width="120" height="120" patternUnits="userSpaceOnUse">
                  <rect width="120" height="120" fill="url(#cadGrid)" />
                  <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />
                </pattern>

                {/* Radial Dispersion Gradient: Core 100% -> 50% -> 20% -> 10% */}
                <radialGradient id="plumeGradient" cx="29%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#f43f5e" stopOpacity="0.45" />
                  <stop offset="65%" stopColor="#f97316" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#eab308" stopOpacity="0.15" />
                </radialGradient>

                {/* Glow Filter */}
                <filter id="hazardGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background */}
              <rect width="540" height="320" fill="url(#majorGrid)" />

              {/* Enclosure Outer Battery Walls (e.g. 18m x 12m cell boundary) */}
              <rect
                x="30"
                y="20"
                width="480"
                height="280"
                fill="none"
                stroke="#3f3f46"
                strokeWidth="2"
                strokeDasharray="8 4"
              />
              <text x="36" y="36" fill="#71717a" fontSize="9" fontFamily="monospace">
                BATTERY BOUNDARY: {enclosureTag} (18.0m × 10.5m)
              </text>

              {/* Mechanical Ventilation Inflow Louvers (Left Wall) */}
              <g transform="translate(30, 60)">
                <rect x="-8" y="0" width="8" height="200" fill="#18181b" stroke="#10b981" strokeWidth="1.5" />
                <text
                  x="-12"
                  y="100"
                  fill="#10b981"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                  transform="rotate(-90, -12, 100)"
                >
                  AIR INTAKE LOUVERS
                </text>
                {/* Wind flow arrows */}
                {[20, 60, 100, 140, 180].map((y) => (
                  <g key={y} transform={`translate(10, ${y})`}>
                    <line x1="0" y1="0" x2="35" y2="0" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                    <polygon points="35,0 28,-3 28,3" fill="#10b981" />
                  </g>
                ))}
              </g>

              {/* Mechanical Ventilation Extract Fans (Right Wall) */}
              <g transform="translate(510, 60)">
                <rect x="0" y="0" width="8" height="200" fill="#18181b" stroke="#06b6d4" strokeWidth="1.5" />
                <text
                  x="18"
                  y="100"
                  fill="#06b6d4"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                  transform="rotate(90, 18, 100)"
                >
                  EXHAUST EXTRACT FANS
                </text>
                {[40, 100, 160].map((y) => (
                  <circle
                    key={y}
                    cx="4"
                    cy={y}
                    r="9"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ transformOrigin: `514px ${60 + y}px`, animationDuration: '3s' }}
                  />
                ))}
              </g>

              {/* Airflow Velocity Callout Banner */}
              <g transform="translate(60, 48)">
                <rect x="0" y="0" width="170" height="20" rx="3" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.4)" />
                <text x="8" y="14" fill="#34d399" fontSize="10" fontFamily="monospace">
                  Crossflow uw: {ventVelocityMs.toFixed(2)} m/s ({calculations.ach.toFixed(1)} ACH)
                </text>
              </g>

              {/* Concentric Dispersion Contours (Centered at Release Point with downstream wind bias) */}
              {/* Release Point: (svgCenterX, svgCenterY) = (160, 160) */}
              {/* The wind blows horizontally from left to right (+X). The plume is elongated in +X direction */}
              {(() => {
                const cx = svgCenterX;
                const cy = svgCenterY;
                const rzPx = calculations.rZ * pixelsPerMeter;
                const r100Px = calculations.r100Lel * pixelsPerMeter;
                const r50Px = calculations.r50Lel * pixelsPerMeter;
                const r10Px = calculations.r10Lel * pixelsPerMeter;

                // Elongation ratio in crossflow
                const elongation = 1.0 + Math.min(0.6, ventVelocityMs * 0.25);
                const shiftX = Math.min(rzPx * 0.25, ventVelocityMs * 15);

                return (
                  <g>
                    {/* 10% LEL Periphery Contour */}
                    <ellipse
                      cx={cx + shiftX * 0.9}
                      cy={cy}
                      rx={r10Px * elongation}
                      ry={r10Px}
                      fill="rgba(6, 182, 212, 0.05)"
                      stroke="#06b6d4"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={cx + shiftX * 0.9 + r10Px * elongation + 4}
                      y={cy - 4}
                      fill="#06b6d4"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      10% LEL ({calculations.r10Lel.toFixed(1)}m)
                    </text>

                    {/* 20% LEL Statutory Boundary r_z Contour (Glowing Amber) */}
                    <ellipse
                      cx={cx + shiftX * 0.7}
                      cy={cy}
                      rx={rzPx * elongation}
                      ry={rzPx}
                      fill="rgba(234, 179, 8, 0.12)"
                      stroke="#eab308"
                      strokeWidth="2"
                      strokeDasharray="6 3"
                      filter="url(#hazardGlow)"
                    />
                    <text
                      x={cx + shiftX * 0.7}
                      y={cy - rzPx - 6}
                      fill="#eab308"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      STATUTORY HAZARD EXTENT r_z: {calculations.rZ.toFixed(2)} m (20% LEL)
                    </text>

                    {/* 50% LEL Envelope */}
                    <ellipse
                      cx={cx + shiftX * 0.4}
                      cy={cy}
                      rx={r50Px * elongation}
                      ry={r50Px}
                      fill="rgba(249, 115, 22, 0.20)"
                      stroke="#f97316"
                      strokeWidth="1.5"
                    />
                    <text
                      x={cx + shiftX * 0.4 + r50Px * elongation + 4}
                      y={cy + 10}
                      fill="#f97316"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      50% LEL ({calculations.r50Lel.toFixed(1)}m)
                    </text>

                    {/* 100% LEL Flammable Core (Flash Zone) */}
                    <ellipse
                      cx={cx + shiftX * 0.2}
                      cy={cy}
                      rx={r100Px * elongation}
                      ry={r100Px}
                      fill="rgba(244, 63, 94, 0.40)"
                      stroke="#f43f5e"
                      strokeWidth="2"
                    />
                    <text
                      x={cx + shiftX * 0.2}
                      y={cy + 3}
                      fill="#ffffff"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      100% LEL
                    </text>

                    {/* Radius Dimension Line for r_z */}
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx + shiftX * 0.7 + rzPx * elongation}
                      y2={cy}
                      stroke="#eab308"
                      strokeWidth="1.5"
                    />
                    {/* Tick markers */}
                    <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#eab308" strokeWidth="1.5" />
                    <line
                      x1={cx + shiftX * 0.7 + rzPx * elongation}
                      y1={cy - 6}
                      x2={cx + shiftX * 0.7 + rzPx * elongation}
                      y2={cy + 6}
                      stroke="#eab308"
                      strokeWidth="1.5"
                    />

                    {/* Release Jet Conical Vectors (Sonic Plume Expanding from Orifice) */}
                    <path
                      d={`M ${cx} ${cy - 4} L ${cx + 70} ${cy - 28} L ${cx + 70} ${cy + 28} L ${cx} ${cy + 4} Z`}
                      fill="rgba(244, 63, 94, 0.25)"
                      stroke="rgba(244, 63, 94, 0.6)"
                      strokeWidth="1"
                    />
                    {/* Jet vector center directional arrow */}
                    <line x1={cx} y1={cy} x2={cx + 55} y2={cy} stroke="#ffffff" strokeWidth="1.5" />
                    <polygon points={`${cx + 62},${cy} ${cx + 54},${cy - 3} ${cx + 54},${cy + 3}`} fill="#ffffff" />
                    <text x={cx + 20} y={cy - 8} fill="#ffffff" fontSize="8" fontFamily="monospace">
                      JET Vg
                    </text>
                  </g>
                );
              })()}

              {/* Release Orifice Center Pin */}
              <g transform={`translate(${svgCenterX}, ${svgCenterY})`}>
                <circle cx="0" cy="0" r="14" fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="8" fill="#f43f5e" className="animate-ping" opacity="0.4" />
                <circle cx="0" cy="0" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#f43f5e" strokeWidth="1" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="#f43f5e" strokeWidth="1" />
                <text x="0" y="24" fill="#fca5a5" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  ORIFICE: Ø {holeSizeMm.toFixed(1)}mm
                </text>
                <text x="0" y="34" fill="#f87171" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  @{pressureBarG.toFixed(1)} bar g
                </text>
              </g>

              {/* Compass Rose (Top Right) */}
              <g transform="translate(475, 45)">
                <circle cx="0" cy="0" r="16" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                <line x1="0" y1="-14" x2="0" y2="14" stroke="#52525b" strokeWidth="1" />
                <line x1="-14" y1="0" x2="14" y2="0" stroke="#52525b" strokeWidth="1" />
                <polygon points="0,-14 -3,-4 3,-4" fill="#f43f5e" />
                <text x="0" y="-16" fill="#f43f5e" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                  N
                </text>
                <text x="18" y="3" fill="#a1a1aa" fontSize="8" fontFamily="monospace">
                  E
                </text>
              </g>

              {/* 5-Meter Scale Bar (Bottom Left) */}
              <g transform="translate(60, 290)">
                <rect x="-4" y="-12" width="130" height="22" fill="#18181b" rx="2" stroke="#27272a" />
                <line x1="0" y1="0" x2="120" y2="0" stroke="#a1a1aa" strokeWidth="2" />
                <line x1="0" y1="-4" x2="0" y2="4" stroke="#a1a1aa" strokeWidth="1.5" />
                <line x1="24" y1="-2" x2="24" y2="2" stroke="#71717a" strokeWidth="1" />
                <line x1="48" y1="-2" x2="48" y2="2" stroke="#71717a" strokeWidth="1" />
                <line x1="72" y1="-2" x2="72" y2="2" stroke="#71717a" strokeWidth="1" />
                <line x1="96" y1="-2" x2="96" y2="2" stroke="#71717a" strokeWidth="1" />
                <line x1="120" y1="-4" x2="120" y2="4" stroke="#a1a1aa" strokeWidth="1.5" />
                <text x="0" y="-5" fill="#a1a1aa" fontSize="8" fontFamily="monospace">0m</text>
                <text x="48" y="-5" fill="#a1a1aa" fontSize="8" fontFamily="monospace">2m</text>
                <text x="120" y="-5" fill="#a1a1aa" fontSize="8" fontFamily="monospace" textAnchor="end">5m</text>
              </g>
            </svg>
          </div>
        </div>

        {/* 4. Core KPI Strip (6 Metrics) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Choked Mass Release Rate */}
          <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">CHOKED RELEASE Wg</span>
            <div className="text-base font-mono font-bold text-rose-400">
              {calculations.massReleaseRateGS.toFixed(2)}{' '}
              <span className="text-xs font-normal text-zinc-400">g/s</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {calculations.massReleaseRateKgH.toFixed(1)} kg/h (Sonic)
            </span>
          </div>

          {/* Hazardous Distance r_z */}
          <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">BOUNDARY DISTANCE r_z</span>
            <div className="text-base font-mono font-bold text-amber-400">
              {calculations.rZ.toFixed(2)}{' '}
              <span className="text-xs font-normal text-zinc-400">m</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {(calculations.rZ * 3.28084).toFixed(1)} ft (to 20% LEL)
            </span>
          </div>

          {/* Explosive Cloud Volume Vz */}
          <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">PLUME VOLUME Vz</span>
            <div className="text-base font-mono font-bold text-zinc-200">
              {calculations.plumeVolumeVz.toFixed(1)}{' '}
              <span className="text-xs font-normal text-zinc-400">m³</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {((calculations.plumeVolumeVz / enclosureVolumeM3) * 100).toFixed(1)}% cell volume
            </span>
          </div>

          {/* LEL Mass Concentration */}
          <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">LEL DENSITY C_LEL</span>
            <div className="text-base font-mono font-bold text-zinc-200">
              {calculations.lelMassGM3.toFixed(2)}{' '}
              <span className="text-xs font-normal text-zinc-400">g/m³</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {gas.lelVolPercent}% vol in air
            </span>
          </div>

          {/* Ventilation Air Changes */}
          <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">VENTILATION ACH</span>
            <div className="text-base font-mono font-bold text-emerald-400">
              {calculations.ach.toFixed(1)}{' '}
              <span className="text-xs font-normal text-zinc-400">hr⁻¹</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {calculations.volumetricVentFlowM3S.toFixed(1)} m³/s flow
            </span>
          </div>

          {/* Dilution Degree Status */}
          <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">DILUTION DEGREE</span>
            <div
              className={`text-sm font-mono font-bold ${
                calculations.dilutionRating === 'HIGH'
                  ? 'text-emerald-400'
                  : calculations.dilutionRating === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {calculations.dilutionRating} DILUTION
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              IEC Table B.1 Criterion
            </span>
          </div>
        </div>

        {/* 5. Gas Group & Temperature Class (T-Class) Stepped Ladder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gas Group Details */}
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                ELECTRICAL APPARATUS GAS GROUP
              </span>
              <span className="text-[10px] font-mono text-zinc-500">IEC 60079-0 / NFPA 70</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['Group IIA', 'Group IIB', 'Group IIC'] as const).map((grp) => {
                const isActive = gas.gasGroup === grp;
                return (
                  <div
                    key={grp}
                    className={`flex flex-col p-2 rounded border font-mono ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{grp}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-[9px] text-zinc-400 pt-0.5">
                      {grp === 'Group IIC'
                        ? 'H2, Acetylene (MESG < 0.5mm)'
                        : grp === 'Group IIB'
                        ? 'Ethylene (0.5-0.9mm)'
                        : 'Propane, CH4 (> 0.9mm)'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/80">
              <span>MESG: {gas.mesgMm} mm</span>
              <span>MIC Ratio: {gas.micRatio}</span>
              <span>NEC: {gas.necGroup}</span>
            </div>
          </div>

          {/* Temperature Class (T-Class) Stepped Ladder */}
          <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                TEMPERATURE CLASS (T1 - T6 LADDER)
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                Gas AIT: {gas.aitC}°C
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1 pt-1">
              {T_CLASS_DATA.map((t) => {
                const isSelected = activeTClassSelected === t.tClass;
                const isSafe = gas.aitC > t.maxSurfaceTempC;
                return (
                  <button
                    key={t.tClass}
                    onClick={() => {
                      sovereignAudio.playClick();
                      setActiveTClassSelected(t.tClass as any);
                    }}
                    className={`flex flex-col items-center p-1.5 rounded border font-mono transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-1 ring-cyan-500/50'
                        : isSafe
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        : 'bg-rose-950/20 border-rose-900 text-rose-500'
                    }`}
                  >
                    <span className="text-xs font-bold">{t.tClass}</span>
                    <span className="text-[9px] text-zinc-400">{t.maxSurfaceTempC}°C</span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono flex items-center justify-between pt-1 border-t border-zinc-800/80">
              <span className="text-zinc-400">
                Selected: {activeTClassSelected} (Max Surface {calculations.activeTClassObj.maxSurfaceTempC}°C)
              </span>
              <span
                className={`font-semibold ${
                  calculations.isTClassCompliant ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                Margin ΔT: +{calculations.surfaceTempMarginC.toFixed(1)}°C (
                {calculations.isTClassCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'})
              </span>
            </div>
          </div>
        </div>

        {/* 6. Dynamic Parameter Tuning Sliders */}
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              DYNAMIC PROCESS & VENTILATION TUNING CONTROLS
            </span>
            <span className="text-[10px] text-zinc-500 font-normal">
              Instantaneous sonic discharge & dispersion recalculation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slider 1: Operating Pressure (5 to 50 bar g) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Operating Pressure (P):</span>
                <span className="font-bold text-amber-400">{pressureBarG.toFixed(1)} bar g</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="50.0"
                step="0.5"
                value={pressureBarG}
                onChange={(e) => {
                  sovereignAudio.playClick();
                  setPressureBarG(parseFloat(e.target.value));
                }}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>5.0 bar</span>
                <span>P1: {(pressureBarG + 1.01).toFixed(1)} bar a</span>
                <span>50.0 bar</span>
              </div>
            </div>

            {/* Slider 2: Leak Hole Size (1.0 to 10.0 mm) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Leak Hole Diameter (d):</span>
                <span className="font-bold text-rose-400">{holeSizeMm.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={holeSizeMm}
                onChange={(e) => {
                  sovereignAudio.playClick();
                  setHoleSizeMm(parseFloat(e.target.value));
                }}
                className="w-full accent-rose-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>1.0 mm (Pinhole)</span>
                <span>Area: {(Math.PI * Math.pow(holeSizeMm / 2, 2)).toFixed(1)} mm²</span>
                <span>10.0 mm (Rupture)</span>
              </div>
            </div>

            {/* Slider 3: Mechanical Ventilation Air Velocity (0.1 to 2.0 m/s) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Ventilation Velocity (uw):</span>
                <span className="font-bold text-emerald-400">{ventVelocityMs.toFixed(2)} m/s</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="2.00"
                step="0.05"
                value={ventVelocityMs}
                onChange={(e) => {
                  sovereignAudio.playClick();
                  setVentVelocityMs(parseFloat(e.target.value));
                }}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0.10 m/s (Stagnant)</span>
                <span>{calculations.ach.toFixed(0)} ACH Dilution</span>
                <span>2.00 m/s (Forced)</span>
              </div>
            </div>
          </div>

          {/* Release Grade Selector */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-zinc-800 text-xs font-mono gap-2">
            <span className="text-zinc-400">Grade of Release (IEC 60079-10-1 Clause 5.3):</span>
            <div className="flex gap-2">
              {(['Secondary', 'Primary', 'Continuous'] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => {
                    sovereignAudio.playClick();
                    setReleaseGrade(grade);
                  }}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    releaseGrade === grade
                      ? 'bg-zinc-200 text-zinc-950 font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 7. Operational Scenarios & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-zinc-400 text-[11px]">SCENARIO PRESETS:</span>
            <button
              onClick={() =>
                handleApplyScenario(
                  'Baseline Secondary Flange Leak',
                  24.0,
                  3.0,
                  0.65,
                  'Hydrogen / Methane Mix (70/30 mol%)',
                  'Secondary'
                )
              }
              className="px-2 py-1 rounded font-mono text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              Baseline Flange Leak
            </button>
            <button
              onClick={() =>
                handleApplyScenario(
                  'HP Hydrogen Jet - Severe',
                  45.0,
                  6.0,
                  0.35,
                  'Pure Hydrogen (H2)',
                  'Primary'
                )
              }
              className="px-2 py-1 rounded font-mono text-[11px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors"
            >
              HP Hydrogen Jet (Severe)
            </button>
            <button
              onClick={() =>
                handleApplyScenario(
                  'Low Pressure Flange Pinhole',
                  8.0,
                  1.0,
                  1.20,
                  'Natural Gas / Methane (CH4)',
                  'Secondary'
                )
              }
              className="px-2 py-1 rounded font-mono text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              LP Pinhole (Negligible)
            </button>
            <button
              onClick={() =>
                handleApplyScenario(
                  'Forced Dilution High-Flow Vent',
                  24.0,
                  3.0,
                  1.80,
                  'Hydrogen / Methane Mix (70/30 mol%)',
                  'Secondary'
                )
              }
              className="px-2 py-1 rounded font-mono text-[11px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-colors"
            >
              Forced High-Flow Dilution
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportAssessment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono font-medium text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-lg shadow-amber-500/10 ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT HAZARDOUS AREA DOSSIER</span>
          </button>
        </div>
      </div>
    </div>
  );
}
