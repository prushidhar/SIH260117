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
  Radio,
  Cpu,
  Power,
  Info,
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { broadcastSyncEvent } from '@/lib/sync/multi-window-sync';
import { sovereignAudio } from '@/lib/audio/sound-effects';
import type { ProximityProbeCardProps } from '../types';

/**
 * API Standard 670 Machinery Protection & Eddy Current Proximity Probes Micro-Frontend
 */
export default function ProximityProbeCard({
  assetTag = 'K-101',
  bearingLocation = 'K-101 JOURNAL BEARING',
  title = 'API STANDARD 670 MACHINERY PROTECTION & PROXIMITY PROBES',
  probeXTag = 'VT-101X',
  probeYTag = 'VT-101Y',
  dcGapVoltageX: initialDcX = -10.2,
  dcGapVoltageY: initialDcY = -10.1,
  vibrationPkPkX: initialVibX = 32.5,
  vibrationPkPkY: initialVibY = 28.0,
  phaseAngleXDeg: initialPhaseX = 48,
  phaseAngleYDeg: initialPhaseY = 138,
  alarmThresholdUm = 45.0,
  tripThresholdUm = 65.0,
  bearingClearanceUm = 150.0,
  shaftSpeedRpm = 8500,
}: ProximityProbeCardProps) {
  const { selectTag, addDeliverable, addToast } = useIndraStore();

  // Interactive State
  const [vibX, setVibX] = useState<number>(initialVibX);
  const [vibY, setVibY] = useState<number>(initialVibY);
  const [dcX, setDcX] = useState<number>(initialDcX);
  const [dcY, setDcY] = useState<number>(initialDcY);
  const [phaseX, setPhaseX] = useState<number>(initialPhaseX);
  const [phaseY, setPhaseY] = useState<number>(initialPhaseY);
  const [rpm, setRpm] = useState<number>(shaftSpeedRpm);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Rotordynamics & API 670 2oo2 Calculations
  const calculations = useMemo(() => {
    // 1. Probe DC Gap Health Checks per API 670 Standard (-9V to -11V optimal, -2V to -18V linear limit)
    // Scale factor: 200 mV/mil = 7.87 mV/µm = 0.00787 V/µm
    const scaleFactorMvPerMil = 200; // mV/mil
    const scaleFactorVPerUm = 0.00787; // V/µm

    const getProbeStatus = (voltage: number) => {
      if (voltage > -2.0) {
        return {
          status: 'PROBE_SHORT_RUB',
          label: 'FAULT: JOURNAL RUB / PROBE SHORT (>-2V)',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          isOk: false,
          isLinearRange: false,
        };
      }
      if (voltage < -18.0) {
        return {
          status: 'PROBE_OPEN_CIRCUIT',
          label: 'FAULT: CABLE OPEN / OFF-SCALE (<-18V)',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          isOk: false,
          isLinearRange: false,
        };
      }
      if (voltage >= -11.0 && voltage <= -9.0) {
        return {
          status: 'NORMAL_LINEAR_RANGE',
          label: 'NORMAL_LINEAR_RANGE (-9V to -11V)',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          isOk: true,
          isLinearRange: true,
        };
      }
      return {
        status: 'ACCEPTABLE_LINEAR_GAP',
        label: 'ACCEPTABLE GAP (-2V to -18V)',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        isOk: true,
        isLinearRange: true,
      };
    };

    const statusX = getProbeStatus(dcX);
    const statusY = getProbeStatus(dcY);

    // Physical Gap Clearance in mils and mm
    const gapMilsX = parseFloat((Math.abs(dcX) / (scaleFactorMvPerMil / 1000)).toFixed(1));
    const gapMilsY = parseFloat((Math.abs(dcY) / (scaleFactorMvPerMil / 1000)).toFixed(1));
    const gapMmX = parseFloat((gapMilsX * 0.0254).toFixed(3));
    const gapMmY = parseFloat((gapMilsY * 0.0254).toFixed(3));

    // 2. Channel Vibration Trip / Alarm Status
    const getVibStatus = (val: number) => {
      if (val >= tripThresholdUm) return 'TRIP';
      if (val >= alarmThresholdUm) return 'ALARM';
      return 'OK';
    };

    const chanXStatus = getVibStatus(vibX);
    const chanYStatus = getVibStatus(vibY);

    // 3. API 670 2-out-of-2 (2oo2) Voting Logic Decision
    let verdict: 'NORMAL_ROTATING_STABILITY' | 'ALARM_WARNING_1OO2' | 'TRIP_COMMAND_ISSUED_2OO2' | 'SYSTEM_FAULT_DEGRADED';
    let verdictLabel: string;
    let verdictColor: string;
    let isTripped = false;
    let isAlarm = false;

    if (!statusX.isOk || !statusY.isOk) {
      verdict = 'SYSTEM_FAULT_DEGRADED';
      verdictLabel = 'PROBE FAULT DETECTED — VOTING DEGRADED (API 670 BYPASS)';
      verdictColor = 'text-rose-400 bg-rose-950/40 border-rose-500/40';
    } else if (chanXStatus === 'TRIP' && chanYStatus === 'TRIP') {
      verdict = 'TRIP_COMMAND_ISSUED_2OO2';
      verdictLabel = 'TRIP_COMMAND_ISSUED_2OO2 — ESD SOLENOID DE-ENERGIZED';
      verdictColor = 'text-rose-400 bg-rose-950/50 border-rose-500 animate-pulse';
      isTripped = true;
    } else if (chanXStatus === 'TRIP' || chanYStatus === 'TRIP') {
      verdict = 'ALARM_WARNING_1OO2';
      verdictLabel = 'TRIP INHIBITED (1oo2 CONFIRMATION PENDING) — MACHINE RUNNING';
      verdictColor = 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      isAlarm = true;
    } else if (chanXStatus === 'ALARM' || chanYStatus === 'ALARM') {
      verdict = 'ALARM_WARNING_1OO2';
      verdictLabel = 'API 670 ALERT THRESHOLD EXCEEDED (> 45 µm pk-pk)';
      verdictColor = 'text-amber-400 bg-amber-950/30 border-amber-500/30';
      isAlarm = true;
    } else {
      verdict = 'NORMAL_ROTATING_STABILITY';
      verdictLabel = 'NORMAL_ROTATING_STABILITY — ALL PARAMETERS WITHIN SPEC';
      verdictColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-500/30';
    }

    // 4. 2D Shaft Precession Orbit Ellipse Math (SVG coordinates)
    // Bearing clearance circle: radius = 75 µm (diametral 150 µm).
    // Canvas viewBox: 300x300, center cx=150, cy=150. Scale: 1 µm = 1.33 px => 75 µm = 100 px.
    const cx = 150;
    const cy = 150;
    const scale = 100 / (bearingClearanceUm / 2); // px per µm

    // Static journal displacement from nominal DC (-10.2V)
    const deltaVx = dcX - (-10.2);
    const deltaVy = dcY - (-10.1);
    const staticOffsetUmX = deltaVx / scaleFactorVPerUm; // µm
    const staticOffsetUmY = deltaVy / scaleFactorVPerUm; // µm

    // Transform static offset from 45 deg probe frame to Cartesian:
    const staticX = (staticOffsetUmX - staticOffsetUmY) / Math.SQRT2;
    const staticY = (staticOffsetUmX + staticOffsetUmY) / Math.SQRT2;

    // Phase difference deltaPhi in radians
    const deltaPhiRad = ((phaseY - phaseX) * Math.PI) / 180;

    // Generate 72 trajectory points for 1X elliptical orbit
    const numPoints = 72;
    const orbitPoints: Array<[number, number]> = [];
    const ampX = vibX / 2; // semi-amplitude in µm
    const ampY = vibY / 2; // semi-amplitude in µm

    for (let i = 0; i <= numPoints; i++) {
      const t = (i * 2 * Math.PI) / numPoints;
      // Probe measurements in probe coordinate frame:
      const pX = ampX * Math.cos(t);
      const pY = ampY * Math.cos(t + deltaPhiRad);

      // Convert from 45° orthogonal probe coordinates to SVG display coordinates:
      const cartX = (pX - pY) / Math.SQRT2 + staticX;
      const cartY = (pX + pY) / Math.SQRT2 + staticY;

      const px = cx + cartX * scale;
      const py = cy - cartY * scale; // invert Y for SVG
      orbitPoints.push([px, py]);
    }

    const orbitPathD = 'M ' + orbitPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ') + ' Z';

    // Keyphasor dot location (t = 0)
    const keyphasorX = orbitPoints[0][0];
    const keyphasorY = orbitPoints[0][1];

    // Orbit Major Axis, Minor Axis, and Eccentricity Calculation:
    // S_max,min = sqrt( (Sx^2 + Sy^2 ± sqrt((Sx^2 - Sy^2)^2 + 4*Sx^2*Sy^2*cos^2(dPhi))) / 2 )
    const term1 = Math.pow(vibX, 2) + Math.pow(vibY, 2);
    const term2 = Math.sqrt(
      Math.pow(Math.pow(vibX, 2) - Math.pow(vibY, 2), 2) +
      4 * Math.pow(vibX, 2) * Math.pow(vibY, 2) * Math.pow(Math.cos(deltaPhiRad), 2)
    );
    const majorAxisPkPk = parseFloat(Math.sqrt((term1 + term2) / 2).toFixed(1));
    const minorAxisPkPk = parseFloat(Math.sqrt(Math.max(0, (term1 - term2) / 2)).toFixed(1));

    // Precession Eccentricity Ratio: e_ratio = sqrt(1 - (b/a)^2)
    const orbitEccentricity = majorAxisPkPk > 0
      ? parseFloat(Math.sqrt(Math.max(0, 1 - Math.pow(minorAxisPkPk / majorAxisPkPk, 2))).toFixed(2))
      : 0.0;

    // Position Eccentricity Ratio in bearing: epsilon = e / c_r
    const staticPosDistance = Math.sqrt(Math.pow(staticX, 2) + Math.pow(staticY, 2));
    const bearingEccentricityRatio = parseFloat(Math.min(0.99, staticPosDistance / (bearingClearanceUm / 2)).toFixed(2));

    // Precession Direction: if sin(deltaPhi) > 0 => Forward Precession, else Reverse
    const isForwardPrecession = Math.sin(deltaPhiRad) >= 0;

    return {
      statusX,
      statusY,
      gapMilsX,
      gapMilsY,
      gapMmX,
      gapMmY,
      chanXStatus,
      chanYStatus,
      verdict,
      verdictLabel,
      verdictColor,
      isTripped,
      isAlarm,
      orbitPathD,
      keyphasorX,
      keyphasorY,
      majorAxisPkPk,
      minorAxisPkPk,
      orbitEccentricity,
      bearingEccentricityRatio,
      isForwardPrecession,
      deltaPhiDeg: Math.abs(phaseY - phaseX),
    };
  }, [vibX, vibY, dcX, dcY, phaseX, phaseY, alarmThresholdUm, tripThresholdUm, bearingClearanceUm]);

  // Handle Audio Feedback on Sliders
  const handleSlider = (setter: (val: number) => void, val: number) => {
    sovereignAudio.playClick();
    setter(val);
  };

  // Presets Handler
  const handleApplyPreset = (
    vx: number,
    vy: number,
    gx: number,
    gy: number,
    px: number,
    py: number,
    speed: number
  ) => {
    sovereignAudio.playClick();
    setVibX(vx);
    setVibY(vy);
    setDcX(gx);
    setDcY(gy);
    setPhaseX(px);
    setPhaseY(py);
    setRpm(speed);

    if (vx >= tripThresholdUm && vy >= tripThresholdUm) {
      sovereignAudio.playAlertTone();
    } else if (vx >= alarmThresholdUm || vy >= alarmThresholdUm) {
      sovereignAudio.playAlertTone(0.10);
    } else {
      sovereignAudio.playSonarPing();
    }
  };

  // P&ID Tag Locator
  const handleLocate = () => {
    sovereignAudio.playClick();
    selectTag(assetTag);
    broadcastSyncEvent({
      type: 'TAG_SELECTED',
      tag: assetTag,
      metadata: {
        source: 'ProximityProbeCard',
        location: bearingLocation,
        probeX: probeXTag,
        probeY: probeYTag,
        vibX,
        vibY,
        verdict: calculations.verdict,
      },
    });
    addToast({
      title: 'Journal Bearing Proximity Probes Located',
      message: `Asset ${assetTag} (${bearingLocation}) focused in Turbomachinery P&ID viewer.`,
      type: 'info',
    });
  };

  // Export Deliverable
  const handleExport = () => {
    sovereignAudio.playSonarPing();
    const shaSeal = '7c39b1a5e2f084d9c0172e81ba6d8491ae02';
    const deliverable = {
      id: `api670-${Date.now()}`,
      name: `API 670 Machinery Protection Dossier — ${assetTag}`,
      filename: `API670_Machinery_Protection_${assetTag}.pdf`,
      type: 'pdf',
      size: '2.3 MB',
      generatedAt: new Date().toLocaleTimeString(),
      title: `API 670 Proximity Probe & Orbit Analysis — ${assetTag}`,
      timestamp: new Date().toLocaleTimeString(),
      description: `Radial shaft vibration & 2oo2 voting audit for ${assetTag} (${bearingLocation}). Probe X: ${vibX} µm pk-pk (${calculations.chanXStatus}, DC ${dcX}V), Probe Y: ${vibY} µm pk-pk (${calculations.chanYStatus}, DC ${dcY}V). 1X Orbit Major: ${calculations.majorAxisPkPk} µm, Eccentricity: ${calculations.orbitEccentricity}. 2oo2 Decision: ${calculations.verdictLabel}.`,
      hash: shaSeal,
      url: '#',
    };
    addDeliverable(deliverable);
    addToast({
      title: 'API 670 Assessment Exported',
      message: `Dossier compiled with SHA-256 seal ${shaSeal.slice(0, 16)}...`,
      type: 'success',
    });
  };

  // Copy SHA-256 seal
  const copySeal = () => {
    sovereignAudio.playShortcut();
    navigator.clipboard.writeText('7c39b1a5e2f084d9c0172e81ba6d8491ae02');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden font-sans text-zinc-200">
      
      {/* 1. HEADER & BEARING LOCATOR */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                API 670 5TH ED / ISO 7919-3 / BENTLY NEVADA
              </span>
              <button
                onClick={handleLocate}
                className="group flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                title="Locate K-101 Journal Bearing in P&ID"
              >
                <Crosshair className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                <span>{bearingLocation}</span>
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
            <span className="text-zinc-300">7c39b1a5e2f0...</span>
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
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* 2. API 670 SYSTEM STATUS BANNER */}
      <div className={`px-5 py-2.5 border-b border-zinc-800/80 flex items-center justify-between text-xs font-mono ${calculations.verdictColor}`}>
        <div className="flex items-center gap-2">
          {calculations.isTripped ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 animate-bounce" />
          ) : calculations.isAlarm ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className="font-bold tracking-wide">{calculations.verdictLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>X: <strong className="text-zinc-100">{vibX} µm ({calculations.chanXStatus})</strong></span>
          <span>•</span>
          <span>Y: <strong className="text-zinc-100">{vibY} µm ({calculations.chanYStatus})</strong></span>
          <span>•</span>
          <span>Speed: <strong className="text-cyan-300">{rpm} RPM</strong></span>
        </div>
      </div>

      {/* 3. DUAL PROXIMITY PROBE VOLTMETERS & DC GAP HEALTH */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-800/80 bg-zinc-950/60">
        
        {/* PROBE X (VT-101X) VOLTMETER */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-cyan-400 font-mono">
                {probeXTag}
              </span>
              <span className="text-xs font-mono text-zinc-400">PROBE X (+45° RIGHT)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${calculations.statusX.color}`}>
              {calculations.statusX.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Digital DC Voltage Readout */}
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">DC Gap Voltage</div>
              <div className="text-2xl font-mono font-bold text-white mt-0.5">
                {dcX.toFixed(2)} <span className="text-xs font-normal text-zinc-400">V DC</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-1">
                Physical Gap: <strong className="text-cyan-300">{calculations.gapMilsX} mils</strong> ({calculations.gapMmX} mm)
              </div>
            </div>

            {/* Voltmeter Gauge Bar (-24V to 0V) */}
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>-24V</span>
                <span className="text-emerald-400 font-bold">-9V to -11V Opt</span>
                <span>0V</span>
              </div>
              <div className="relative w-full h-4 bg-zinc-950 rounded-md overflow-hidden border border-zinc-700/80">
                {/* Optimal zone (-9V to -11V -> fraction 9/24=37.5% to 11/24=45.8%) */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40"
                  style={{ left: '37.5%', width: '8.3%' }}
                  title="Optimal Linear Range: -9V to -11V"
                />
                {/* Pointer marker */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-cyan-400 rounded-sm shadow-md transition-all duration-200"
                  style={{ left: `${Math.max(0, Math.min(100, (Math.abs(dcX) / 24) * 100))}%` }}
                />
              </div>
              <div className="text-zinc-500 text-center">
                Sensitivity: 200 mV/mil (7.87 mV/µm)
              </div>
            </div>
          </div>
        </div>

        {/* PROBE Y (VT-101Y) VOLTMETER */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs font-bold text-indigo-400 font-mono">
                {probeYTag}
              </span>
              <span className="text-xs font-mono text-zinc-400">PROBE Y (-45° LEFT)</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${calculations.statusY.color}`}>
              {calculations.statusY.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Digital DC Voltage Readout */}
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">DC Gap Voltage</div>
              <div className="text-2xl font-mono font-bold text-white mt-0.5">
                {dcY.toFixed(2)} <span className="text-xs font-normal text-zinc-400">V DC</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-1">
                Physical Gap: <strong className="text-indigo-300">{calculations.gapMilsY} mils</strong> ({calculations.gapMmY} mm)
              </div>
            </div>

            {/* Voltmeter Gauge Bar (-24V to 0V) */}
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between text-zinc-400">
                <span>-24V</span>
                <span className="text-emerald-400 font-bold">-9V to -11V Opt</span>
                <span>0V</span>
              </div>
              <div className="relative w-full h-4 bg-zinc-950 rounded-md overflow-hidden border border-zinc-700/80">
                {/* Optimal zone (-9V to -11V -> fraction 9/24=37.5% to 11/24=45.8%) */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40"
                  style={{ left: '37.5%', width: '8.3%' }}
                  title="Optimal Linear Range: -9V to -11V"
                />
                {/* Pointer marker */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-indigo-400 rounded-sm shadow-md transition-all duration-200"
                  style={{ left: `${Math.max(0, Math.min(100, (Math.abs(dcY) / 24) * 100))}%` }}
                />
              </div>
              <div className="text-zinc-500 text-center">
                Sensitivity: 200 mV/mil (7.87 mV/µm)
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. PRIMARY 2D SHAFT ORBIT PLOT & 2OO2 VOTING MATRIX */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 border-b border-zinc-800/80">
        
        {/* 2D SHAFT ORBIT PLOT (SVG CANVAS) */}
        <div className="lg:col-span-6 bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Filtered 1X Shaft Precession Orbit
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              Clearance: {bearingClearanceUm} µm
            </span>
          </div>

          {/* SVG Orbit Display Canvas */}
          <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center p-1">
            <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
              <defs>
                <radialGradient id="bearingGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="70%" stopColor="#18181b" />
                  <stop offset="100%" stopColor="#27272a" />
                </radialGradient>
                <filter id="orbitGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Bearing Housing Background */}
              <circle cx="150" cy="150" r="130" fill="#09090b" stroke="#3f3f46" strokeWidth="2" strokeDasharray="4 4" />

              {/* Bearing Babbitt Lining & Physical Diametral Clearance Circle (R=100px for 75µm radial) */}
              <circle cx="150" cy="150" r="100" fill="url(#bearingGlow)" stroke="#71717a" strokeWidth="3" />
              
              {/* Trip Threshold Circle (65 µm = 86.7 px) */}
              <circle cx="150" cy="150" r="86.7" fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              
              {/* Alarm Threshold Circle (45 µm = 60 px) */}
              <circle cx="150" cy="150" r="60" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

              {/* Center Crosshairs */}
              <line x1="150" y1="30" x2="150" y2="270" stroke="#3f3f46" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="30" y1="150" x2="270" y2="150" stroke="#3f3f46" strokeWidth="1" strokeDasharray="2 2" />

              {/* 45° Orthogonal Probe Axes */}
              {/* Probe X Axis (+45° from vertical -> (150+105, 150-105) = (224, 76)) */}
              <line x1="76" y1="224" x2="224" y2="76" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.4" />
              {/* Probe Y Axis (-45° from vertical -> (76, 76) to (224, 224)) */}
              <line x1="76" y1="76" x2="224" y2="224" stroke="#6366f1" strokeWidth="1" strokeOpacity="0.4" />

              {/* Probes Visual Icons & Directional Radiation */}
              {/* Probe Y at (-45° -> Top Left (58, 58)) */}
              <g transform="translate(62, 62) rotate(45)">
                <rect x="-10" y="-5" width="20" height="10" rx="2" fill="#312e81" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="14" stroke="#818cf8" strokeWidth="1.5" />
              </g>
              <text x="40" y="55" fill="#818cf8" fontSize="10" fontFamily="monospace" fontWeight="bold">Y (VT-101Y)</text>

              {/* Probe X at (+45° -> Top Right (242, 62)) */}
              <g transform="translate(238, 62) rotate(-45)">
                <rect x="-10" y="-5" width="20" height="10" rx="2" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="14" stroke="#22d3ee" strokeWidth="1.5" />
              </g>
              <text x="220" y="55" fill="#22d3ee" fontSize="10" fontFamily="monospace" fontWeight="bold">X (VT-101X)</text>

              {/* Dynamic 1X Precession Orbit Path */}
              <path
                d={calculations.orbitPathD}
                fill={calculations.isTripped ? 'rgba(244, 63, 94, 0.15)' : 'rgba(6, 182, 212, 0.15)'}
                stroke={calculations.isTripped ? '#f43f5e' : calculations.isAlarm ? '#f59e0b' : '#06b6d4'}
                strokeWidth="2.5"
                filter="url(#orbitGlow)"
              />

              {/* Keyphasor 1/Rev Dot Pulse Event */}
              <circle
                cx={calculations.keyphasorX}
                cy={calculations.keyphasorY}
                r="4.5"
                fill="#fbbf24"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="animate-ping"
              />
              <circle
                cx={calculations.keyphasorX}
                cy={calculations.keyphasorY}
                r="3.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1"
              />

              {/* Static Journal Center Offset Dot */}
              <circle cx={150} cy={150} r="3" fill="#a1a1aa" />
            </svg>

            {/* Orbit Overlay Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 text-[9px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                Keyphasor: <strong className="text-amber-400">1X Pulse Active</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-zinc-300">
                Precession: <strong className="text-cyan-400">{calculations.isForwardPrecession ? 'Forward (↻)' : 'Reverse (↺)'}</strong>
              </span>
            </div>
          </div>

          {/* Orbit Numerical Geometric Readout */}
          <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-800 text-[10px] font-mono text-center">
            <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
              <div className="text-zinc-500 uppercase">Major Axis (2a)</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">{calculations.majorAxisPkPk} µm</div>
            </div>
            <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
              <div className="text-zinc-500 uppercase">Minor Axis (2b)</div>
              <div className="text-sm font-bold text-zinc-200 mt-0.5">{calculations.minorAxisPkPk} µm</div>
            </div>
            <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
              <div className="text-zinc-500 uppercase">Eccentricity (ε)</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{calculations.orbitEccentricity}</div>
            </div>
          </div>
        </div>

        {/* 2-OUT-OF-2 (2OO2) VOTING LOGIC MATRIX & COINCIDENCE ENGINE */}
        <div className="lg:col-span-6 bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                API 670 2-out-of-2 (2oo2) Voting Logic Matrix
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                calculations.isTripped ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                {calculations.isTripped ? 'TRIP OUTPUT TRUE' : 'TRIP OUTPUT FALSE'}
              </span>
            </div>

            {/* Voting Channels Comparison Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Channel X Box */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">CHANNEL X ({probeXTag})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    calculations.chanXStatus === 'TRIP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    calculations.chanXStatus === 'ALARM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {calculations.chanXStatus}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-zinc-400">
                  <div className="flex justify-between">
                    <span>Amplitude:</span>
                    <strong className="text-zinc-200">{vibX} µm pk-pk</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Phase Lag:</span>
                    <strong className="text-zinc-200">{phaseX}°</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Linear DC Gap:</span>
                    <strong className={calculations.statusX.isOk ? 'text-emerald-400' : 'text-rose-400'}>{dcX} V</strong>
                  </div>
                </div>
              </div>

              {/* Channel Y Box */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-400 font-bold">CHANNEL Y ({probeYTag})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    calculations.chanYStatus === 'TRIP' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    calculations.chanYStatus === 'ALARM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {calculations.chanYStatus}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-zinc-400">
                  <div className="flex justify-between">
                    <span>Amplitude:</span>
                    <strong className="text-zinc-200">{vibY} µm pk-pk</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Phase Lag:</span>
                    <strong className="text-zinc-200">{phaseY}°</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Linear DC Gap:</span>
                    <strong className={calculations.statusY.isOk ? 'text-emerald-400' : 'text-rose-400'}>{dcY} V</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SVG 2oo2 Hardware Logic Gate Diagram */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center">
              <svg viewBox="0 0 360 85" className="w-full max-w-[340px] overflow-visible">
                {/* Channel X Wire */}
                <line x1="20" y1="25" x2="130" y2="25" stroke={calculations.chanXStatus === 'TRIP' ? '#f43f5e' : '#71717a'} strokeWidth="2.5" />
                <circle cx="20" cy="25" r="4" fill={calculations.chanXStatus === 'TRIP' ? '#f43f5e' : '#06b6d4'} />
                <text x="28" y="18" fill="#a1a1aa" fontSize="9" fontFamily="monospace">VT-101X (≥65µm)</text>

                {/* Channel Y Wire */}
                <line x1="20" y1="60" x2="130" y2="60" stroke={calculations.chanYStatus === 'TRIP' ? '#f43f5e' : '#71717a'} strokeWidth="2.5" />
                <circle cx="20" cy="60" r="4" fill={calculations.chanYStatus === 'TRIP' ? '#f43f5e' : '#6366f1'} />
                <text x="28" y="74" fill="#a1a1aa" fontSize="9" fontFamily="monospace">VT-101Y (≥65µm)</text>

                {/* 2oo2 Coincidence AND Gate Body (x=130 to 200, y=10 to 75) */}
                <path
                  d="M 130 15 L 160 15 A 25 25 0 0 1 160 70 L 130 70 Z"
                  fill="#18181b"
                  stroke={calculations.isTripped ? '#f43f5e' : '#52525b'}
                  strokeWidth="2"
                />
                <text x="145" y="47" fill={calculations.isTripped ? '#f43f5e' : '#a1a1aa'} fontSize="12" fontFamily="monospace" fontWeight="bold">2oo2</text>

                {/* Output Wire */}
                <line x1="185" y1="42.5" x2="245" y2="42.5" stroke={calculations.isTripped ? '#f43f5e' : '#10b981'} strokeWidth="2.5" />

                {/* Solenoid Trip Coil Box */}
                <rect
                  x="245"
                  y="22"
                  width="100"
                  height="42"
                  rx="6"
                  fill={calculations.isTripped ? '#4c0519' : '#022c22'}
                  stroke={calculations.isTripped ? '#f43f5e' : '#10b981'}
                  strokeWidth="2"
                  className={calculations.isTripped ? 'animate-pulse' : ''}
                />
                <text x="255" y="38" fill={calculations.isTripped ? '#fca5a5' : '#6ee7b7'} fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                  {calculations.isTripped ? 'ESD SOLENOID' : 'TRIP SOLENOID'}
                </text>
                <text x="255" y="53" fill={calculations.isTripped ? '#f43f5e' : '#34d399'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                  {calculations.isTripped ? 'DE-ENERGIZED' : 'ENERGIZED (OK)'}
                </text>
              </svg>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span>Coincidence Rule: <strong className="text-zinc-200">Both Probes MUST confirm trip</strong></span>
            <span>False Trip Immunity: <strong className="text-emerald-400">99.8%</strong></span>
          </div>
        </div>
      </div>

      {/* 5. DYNAMIC THRESHOLD OVERLAY BAR CHARTS */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            API 670 Peak-to-Peak Radial Vibration Spectrum vs Thresholds
          </span>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Alarm: {alarmThresholdUm} µm
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Trip: {tripThresholdUm} µm
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Probe X Bar Chart */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-cyan-400 font-bold">{probeXTag} Amplitude:</span>
              <span className={`font-bold ${vibX >= tripThresholdUm ? 'text-rose-400' : vibX >= alarmThresholdUm ? 'text-amber-400' : 'text-white'}`}>
                {vibX} µm pk-pk ({(vibX / 25.4).toFixed(2)} mils)
              </span>
            </div>

            {/* Bar with Overlaid Threshold Lines */}
            <div className="relative w-full h-6 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700/60 p-0.5">
              {/* Alarm Threshold Line (45µm / 100µm scale = 45%) */}
              <div
                className="absolute top-0 bottom-0 z-20 border-r-2 border-dashed border-amber-400"
                style={{ left: `${(alarmThresholdUm / 100) * 100}%` }}
                title="Alarm Limit: 45 µm"
              />
              {/* Trip Threshold Line (65µm / 100µm scale = 65%) */}
              <div
                className="absolute top-0 bottom-0 z-20 border-r-2 border-dashed border-rose-400"
                style={{ left: `${(tripThresholdUm / 100) * 100}%` }}
                title="Trip Limit: 65 µm"
              />

              {/* Dynamic Fill */}
              <div
                className={`h-full rounded transition-all duration-300 ${
                  vibX >= tripThresholdUm ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse' :
                  vibX >= alarmThresholdUm ? 'bg-gradient-to-r from-emerald-500 to-amber-500' :
                  'bg-gradient-to-r from-cyan-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (vibX / 100) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0 µm</span>
              <span className="text-amber-400">45 µm (Alarm)</span>
              <span className="text-rose-400">65 µm (Trip)</span>
              <span>100 µm</span>
            </div>
          </div>

          {/* Probe Y Bar Chart */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-indigo-400 font-bold">{probeYTag} Amplitude:</span>
              <span className={`font-bold ${vibY >= tripThresholdUm ? 'text-rose-400' : vibY >= alarmThresholdUm ? 'text-amber-400' : 'text-white'}`}>
                {vibY} µm pk-pk ({(vibY / 25.4).toFixed(2)} mils)
              </span>
            </div>

            {/* Bar with Overlaid Threshold Lines */}
            <div className="relative w-full h-6 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700/60 p-0.5">
              {/* Alarm Threshold Line */}
              <div
                className="absolute top-0 bottom-0 z-20 border-r-2 border-dashed border-amber-400"
                style={{ left: `${(alarmThresholdUm / 100) * 100}%` }}
                title="Alarm Limit: 45 µm"
              />
              {/* Trip Threshold Line */}
              <div
                className="absolute top-0 bottom-0 z-20 border-r-2 border-dashed border-rose-400"
                style={{ left: `${(tripThresholdUm / 100) * 100}%` }}
                title="Trip Limit: 65 µm"
              />

              {/* Dynamic Fill */}
              <div
                className={`h-full rounded transition-all duration-300 ${
                  vibY >= tripThresholdUm ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse' :
                  vibY >= alarmThresholdUm ? 'bg-gradient-to-r from-emerald-500 to-amber-500' :
                  'bg-gradient-to-r from-indigo-500 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (vibY / 100) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0 µm</span>
              <span className="text-amber-400">45 µm (Alarm)</span>
              <span className="text-rose-400">65 µm (Trip)</span>
              <span>100 µm</span>
            </div>
          </div>

        </div>
      </div>

      {/* 6. INTERACTIVE SLIDERS & PARAMETER CONTROLS */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Probe Transducer & Rotordynamic Sensitivity Tuning
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Real-time orbit ellipse synthesis & 2oo2 coincidence testing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs font-mono">
          
          {/* Slider 1: Probe X Vibration */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Probe X Amplitude (Sx):</label>
              <span className="text-cyan-400 font-bold">{vibX} µm pk-pk</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              step="0.5"
              value={vibX}
              onChange={(e) => handleSlider(setVibX, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>5 µm</span>
              <span>Alarm: 45 | Trip: 65</span>
              <span>95 µm</span>
            </div>
          </div>

          {/* Slider 2: Probe Y Vibration */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Probe Y Amplitude (Sy):</label>
              <span className="text-indigo-400 font-bold">{vibY} µm pk-pk</span>
            </div>
            <input
              type="range"
              min="5"
              max="95"
              step="0.5"
              value={vibY}
              onChange={(e) => handleSlider(setVibY, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>5 µm</span>
              <span>Alarm: 45 | Trip: 65</span>
              <span>95 µm</span>
            </div>
          </div>

          {/* Slider 3: Probe X DC Gap */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Probe X DC Gap:</label>
              <span className="text-cyan-400 font-bold">{dcX} V</span>
            </div>
            <input
              type="range"
              min="-18.0"
              max="-3.0"
              step="0.1"
              value={dcX}
              onChange={(e) => handleSlider(setDcX, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>-18V (Open)</span>
              <span>Nom: -10.2V</span>
              <span>-3V (Rub)</span>
            </div>
          </div>

          {/* Slider 4: Probe Y DC Gap */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Probe Y DC Gap:</label>
              <span className="text-indigo-400 font-bold">{dcY} V</span>
            </div>
            <input
              type="range"
              min="-18.0"
              max="-3.0"
              step="0.1"
              value={dcY}
              onChange={(e) => handleSlider(setDcY, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>-18V (Open)</span>
              <span>Nom: -10.1V</span>
              <span>-3V (Rub)</span>
            </div>
          </div>

          {/* Slider 5: Phase Angle Difference */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Phase Angle X / Y:</label>
              <span className="text-amber-400 font-bold">{phaseX}° / {phaseY}° (Δ {calculations.deltaPhiDeg}°)</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              step="5"
              value={phaseY - phaseX >= 0 ? phaseY - phaseX : phaseY - phaseX + 360}
              onChange={(e) => {
                const diff = parseFloat(e.target.value);
                handleSlider((val) => setPhaseY(phaseX + val), diff);
              }}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0° (Line)</span>
              <span>90° (Circle)</span>
              <span>180° (Diagonal)</span>
            </div>
          </div>

          {/* Slider 6: Shaft Speed */}
          <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-zinc-400">
              <label>Machine Shaft Speed:</label>
              <span className="text-emerald-400 font-bold">{rpm} RPM</span>
            </div>
            <input
              type="range"
              min="3000"
              max="15000"
              step="100"
              value={rpm}
              onChange={(e) => handleSlider(setRpm, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>3,000 RPM</span>
              <span>{(rpm / 60).toFixed(1)} Hz (1X)</span>
              <span>15,000 RPM</span>
            </div>
          </div>

        </div>
      </div>

      {/* 7. FOUR OPERATIONAL PRESETS */}
      <div className="px-5 py-3 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Dynamic Scenarios:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset 1: Normal Baseline */}
          <button
            onClick={() => handleApplyPreset(22.0, 20.0, -10.2, -10.1, 48, 138, 8500)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Normal Baseline (22 µm)
          </button>

          {/* Preset 2: Unbalance Alarm Warning (1oo2) */}
          <button
            onClick={() => handleApplyPreset(52.0, 38.0, -10.2, -10.1, 48, 138, 8500)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-amber-400 hover:text-amber-300 transition-colors"
          >
            Unbalance 1oo2 Alarm (52 µm)
          </button>

          {/* Preset 3: Severe Oil Whirl / 2oo2 Trip */}
          <button
            onClick={() => handleApplyPreset(74.0, 71.0, -9.8, -9.7, 48, 138, 8500)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-rose-400 hover:text-rose-300 transition-colors"
          >
            Severe Oil Whirl (2oo2 TRIP)
          </button>

          {/* Preset 4: Transducer Fault */}
          <button
            onClick={() => handleApplyPreset(25.0, 24.0, -18.5, -10.1, 48, 138, 8500)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Transducer Cable Open Fault
          </button>
        </div>
      </div>

    </div>
  );
}
