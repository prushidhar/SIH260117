import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Lock,
  Layers,
  FileCheck,
  ShieldCheck,
  DollarSign,
  Activity,
  Sliders,
  ChevronRight,
  Flame,
  Wrench
} from 'lucide-react';
import { sovereignAudio } from '../../../lib/sound/sovereign-audio';
import { useIndraStore } from '../../../store/indra-store';

export interface TurnaroundSchedulerProps {
  initialShutdownId?: string;
  initialPlannedDays?: number;
  initialHourlyCost?: number;
}

interface ShutdownTask {
  id: string;
  name: string;
  durationHrs: number;
  isCritical: boolean;
  totalFloatHrs: number;
  department: 'OPERATIONS' | 'MECHANICAL' | 'INSPECTION' | 'SAFETY';
}

const DEFAULT_TASKS: ShutdownTask[] = [
  { id: 'T01', name: 'Feed Un-heading & Oil Flushing', durationHrs: 8, isCritical: true, totalFloatHrs: 0, department: 'OPERATIONS' },
  { id: 'T02', name: 'Steam-Out, Steaming & LEL Degassing', durationHrs: 16, isCritical: true, totalFloatHrs: 0, department: 'OPERATIONS' },
  { id: 'T03', name: 'Positive Blind List Installation (8 LOTO Blinds)', durationHrs: 12, isCritical: true, totalFloatHrs: 0, department: 'SAFETY' },
  { id: 'T04', name: 'Column T-101 Confined Space Entry Clearance', durationHrs: 6, isCritical: true, totalFloatHrs: 0, department: 'SAFETY' },
  { id: 'T05', name: 'Internal Tray Inspection & Ultrasonic Thickness NDT', durationHrs: 24, isCritical: true, totalFloatHrs: 0, department: 'INSPECTION' },
  { id: 'T06', name: 'Fractionation Trays 12-28 Deck Replacement', durationHrs: 36, isCritical: true, totalFloatHrs: 0, department: 'MECHANICAL' },
  { id: 'T07', name: 'Vessel Box-Up & Torque Tensioning Bolt Closure', durationHrs: 12, isCritical: true, totalFloatHrs: 0, department: 'MECHANICAL' },
  { id: 'T08', name: 'Hydrostatic Shell Re-Test per ASME UG-99', durationHrs: 18, isCritical: true, totalFloatHrs: 0, department: 'INSPECTION' },
  { id: 'T09', name: 'Nitrogen Purge & De-blinding Readiness', durationHrs: 10, isCritical: true, totalFloatHrs: 0, department: 'OPERATIONS' },
  { id: 'T10', name: 'Furnace F-101 Refractory & Burner Overhaul', durationHrs: 48, isCritical: false, totalFloatHrs: 42, department: 'MECHANICAL' },
  { id: 'T11', name: 'Relief Valve PSV-101 Shop Calibration & Re-seat', durationHrs: 24, isCritical: false, totalFloatHrs: 66, department: 'SAFETY' },
  { id: 'T12', name: 'Charge Pump P-101 Seal Upgrade to Dual Plan 53A', durationHrs: 32, isCritical: false, totalFloatHrs: 58, department: 'MECHANICAL' },
];

export const TurnaroundSchedulerWidget: React.FC<TurnaroundSchedulerProps> = ({
  initialShutdownId = 'TAR-2026-CDU1',
  initialPlannedDays = 14,
  initialHourlyCost = 42500.0
}) => {
  const [trayReplacementHours, setTrayReplacementHours] = useState<number>(36);
  const [ndtInspectionHours, setNdtInspectionHours] = useState<number>(24);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('T06');
  const [isPermitSigned, setIsPermitSigned] = useState<boolean>(false);
  const [blindChecked, setBlindChecked] = useState<Record<string, boolean>>({
    'BLIND-01': true,
    'BLIND-02': true,
    'BLIND-03': true,
    'BLIND-04': true,
    'BLIND-05': false,
    'BLIND-06': false,
  });

  const selectTag = useIndraStore((s) => s.selectTag);

  // Dynamic CPM & Financial Calculations
  const cpm = useMemo(() => {
    const tasks = DEFAULT_TASKS.map((t) => {
      if (t.id === 'T06') return { ...t, durationHrs: trayReplacementHours };
      if (t.id === 'T05') return { ...t, durationHrs: ndtInspectionHours };
      return t;
    });

    const critTasks = tasks.filter((t) => t.isCritical);
    const totalCriticalHrs = critTasks.reduce((sum, t) => sum + t.durationHrs, 0);
    const calculatedDays = parseFloat((totalCriticalHrs / 24.0).toFixed(1));
    const varianceDays = parseFloat((calculatedDays - initialPlannedDays).toFixed(1));
    const delayExposureUsd = Math.max(0, varianceDays * 24.0 * initialHourlyCost);

    return {
      tasks,
      totalCriticalHrs,
      calculatedDays,
      varianceDays,
      delayExposureUsd,
      isOnSchedule: varianceDays <= 0
    };
  }, [trayReplacementHours, ndtInspectionHours, initialPlannedDays, initialHourlyCost]);

  const activeTask = useMemo(() => {
    return cpm.tasks.find((t) => t.id === selectedTaskId) || cpm.tasks[5];
  }, [cpm, selectedTaskId]);

  const handleToggleBlind = (id: string) => {
    setBlindChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    sovereignAudio.playClick();
  };

  const handleSignPermit = () => {
    setIsPermitSigned(true);
    sovereignAudio.playSuccess();
    selectTag('CDU-104');
    setTimeout(() => setIsPermitSigned(false), 4500);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-sans my-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-lg shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Refinery Turnaround & CPM Shutdown Optimization
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                TAR ID: {initialShutdownId}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              OSHA 1910.119 PSM • OSHA 1910.147 Control of Hazardous Energy (LOTO) • CPM Scheduling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold ${
            cpm.isOnSchedule
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              : 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
          }`}>
            {cpm.isOnSchedule ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ON SCHEDULE ({Math.abs(cpm.varianceDays)}d FLOAT BUFFER)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>CRITICAL PATH OVERRUN (+{cpm.varianceDays} DAYS)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: CPM Gantt & Critical Path (Left) + Financial Exposure & Blinds (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column: Interactive Gantt & Activity Stepper (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              CRITICAL PATH METHOD (CPM) GANTT NETWORK
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Total Duration: {cpm.calculatedDays} Days ({cpm.totalCriticalHrs} Critical Hours)
            </span>
          </div>

          {/* Activity List with Visual Gantt Bars */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {cpm.tasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              return (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    sovereignAudio.playClick();
                  }}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        task.isCritical
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.isCritical ? 'CRITICAL' : `FLOAT ${task.totalFloatHrs}h`}
                      </span>
                      <span className="font-bold text-white font-sans text-xs">{task.name}</span>
                    </div>
                    <span className="text-cyan-300 font-bold">{task.durationHrs} hrs</span>
                  </div>

                  {/* Horizontal Bar Graphic */}
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        task.isCritical
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : 'bg-gradient-to-r from-cyan-600 to-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, (task.durationHrs / 48) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Duration Sensitivity Slider for Critical Path Bottlenecks */}
          <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              BOTTLENECK SENSITIVITY TUNING (WHAT-IF RECOVERY)
            </span>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>T06 Tray Deck Replacement Duration:</span>
                <span className="text-amber-400 font-bold">{trayReplacementHours} hrs ({parseFloat((trayReplacementHours / 24).toFixed(1))} days)</span>
              </div>
              <input
                type="range"
                min={20}
                max={72}
                step={2}
                value={trayReplacementHours}
                onChange={(e) => setTrayReplacementHours(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>T05 NDT Inspection & Ultrasonic Thickness:</span>
                <span className="text-cyan-400 font-bold">{ndtInspectionHours} hrs</span>
              </div>
              <input
                type="range"
                min={12}
                max={48}
                step={2}
                value={ndtInspectionHours}
                onChange={(e) => setNdtInspectionHours(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Financial Exposure, LOTO Blinds & Work Permit (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Financial Downtime Exposure Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 uppercase font-sans">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              DOWNTIME FINANCIAL RISK & SCHEDULE VARIANCE
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">PLANNED WINDOW</span>
                <span className="text-sm font-bold text-slate-200">{initialPlannedDays} Days</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block">CALCULATED CPM</span>
                <span className={`text-sm font-bold ${cpm.isOnSchedule ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cpm.calculatedDays} Days
                </span>
              </div>
            </div>

            <div className={`p-2.5 rounded-lg border ${
              cpm.delayExposureUsd > 0
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
            }`}>
              <div className="flex justify-between items-center">
                <span>Delay Financial Exposure:</span>
                <span className="text-sm font-bold">
                  ${cpm.delayExposureUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">
                Basis: ${initialHourlyCost.toLocaleString()}/hr crude throughput revenue
              </div>
            </div>
          </div>

          {/* LOTO Positive Blind Isolation Table */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                POSITIVE BLIND ISOLATION CHECKLIST (OSHA 1910.147)
              </span>
              <span className="text-[10px] text-slate-400">
                {Object.values(blindChecked).filter(Boolean).length} / 6 Sealed
              </span>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {[
                { id: 'BLIND-01', location: 'CDU Feed Header Line L-101 (16" 300#)', tag: 'P-101' },
                { id: 'BLIND-02', location: 'Overhead Vapor Line to Condenser E-102 (24" 150#)', tag: 'E-102' },
                { id: 'BLIND-03', location: 'Atmospheric Residue Draw Line to VDU (10" 300#)', tag: 'V-101' },
                { id: 'BLIND-04', location: 'Fuel Gas Supply Line to Furnace F-101 (4" 150#)', tag: 'F-101' },
                { id: 'BLIND-05', location: 'Sour Water Stripper Return Header (6" 150#)', tag: 'T-101' },
                { id: 'BLIND-06', location: 'High Pressure Steam Coil Bleed Line (3" 600#)', tag: 'HX-4201' },
              ].map((b) => {
                const isChecked = blindChecked[b.id];
                return (
                  <div
                    key={b.id}
                    onClick={() => handleToggleBlind(b.id)}
                    className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800/80 hover:bg-slate-800/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 accent-emerald-500 pointer-events-none"
                      />
                      <span className="text-[11px] font-semibold text-slate-200 truncate">{b.location}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{b.id}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Authorize Work Permit Button */}
          <button
            onClick={handleSignPermit}
            disabled={isPermitSigned}
            className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isPermitSigned
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-900/30'
            }`}
          >
            {isPermitSigned ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>SAFE WORK PERMIT & LOTO AUDIT COMMITTED</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>AUTHORIZE SAFE WORK PERMIT (LOCATE CDU-104)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
