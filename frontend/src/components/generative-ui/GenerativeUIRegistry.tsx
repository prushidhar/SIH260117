'use client';

import React from 'react';
import IndustrialGauge from './components/IndustrialGauge';
import TelemetryChart from './components/TelemetryChart';
import ParameterControlForm from './components/ParameterControlForm';
import EquipmentHealthCard from './components/EquipmentHealthCard';
import ASMEComplianceCard from './components/ASMEComplianceCard';
import DynamicSandboxWidget from './components/DynamicSandboxWidget';
import InteractivePIDWidget from './components/InteractivePIDWidget';
import ExecutivePresentationWidget from './components/ExecutivePresentationWidget';
import RootCauseAnalysisWidget from './components/RootCauseAnalysisWidget';
import MultiAgentConsensusWidget from './components/MultiAgentConsensusWidget';
import AlarmRationalizationWidget from './components/AlarmRationalizationWidget';
import { PlantDigitalTwinWidget } from './components/PlantDigitalTwinWidget';
import { HazopLopaWorkbench } from './components/HazopLopaWorkbench';
import { FlareNetworkEmissionWidget } from './components/FlareNetworkEmissionWidget';
import { TurnaroundSchedulerWidget } from './components/TurnaroundSchedulerWidget';
import { CompressorAntiSurgeWidget } from './components/CompressorAntiSurgeWidget';
import { SteamTurbineCogenWidget } from './components/SteamTurbineCogenWidget';

interface RegistryProps {
  component: string;
  props: Record<string, any>;
}

export default function GenerativeUIRegistry({ component, props }: RegistryProps) {
  const compKey = component?.toLowerCase() || '';

  // 1. Industrial Gauge
  if (compKey.includes('gauge') || compKey.includes('meter') || compKey === 'industrialgauge') {
    return <IndustrialGauge {...props} value={props.value ?? 78.4} />;
  }

  // 2. Telemetry Line/Area Chart
  if (compKey.includes('chart') || compKey.includes('telemetry') || compKey.includes('vibration') || compKey === 'telemetrychart') {
    return <TelemetryChart {...props} />;
  }

  // 3. Parameter Control Form / Setpoints
  if (compKey.includes('form') || compKey.includes('control') || compKey.includes('parameter') || compKey === 'parametercontrolform') {
    return <ParameterControlForm {...props} parameters={props.parameters || []} />;
  }

  // 4. Equipment Health Card
  if (compKey.includes('health') || compKey.includes('equipment') || compKey === 'equipmenthealthcard') {
    return <EquipmentHealthCard {...props} tag={props.tag || 'P-101'} name={props.name || 'Equipment'} type={props.type || 'Plant Asset'} healthScore={props.healthScore ?? 90} />;
  }

  // 5. ASME B31.3 / Compliance Calculator
  if (compKey.includes('asme') || compKey.includes('compliance') || compKey.includes('calculator') || compKey === 'asmecompliancecard') {
    return <ASMEComplianceCard {...props} />;
  }

  // 6. Interactive P&ID Schematic Diagram
  if (compKey.includes('pid') || compKey.includes('schematic') || compKey.includes('drawing') || compKey === 'interactivepidwidget') {
    return <InteractivePIDWidget {...props} />;
  }

  // 7. Dynamic Sandbox Widget (AI on-the-fly code)
  if (compKey.includes('sandbox') || compKey.includes('widget') || compKey.includes('code') || compKey === 'dynamicsandboxwidget' || props.code || props.html) {
    return <DynamicSandboxWidget {...props} />;
  }

  // 8. Executive Board Review Presentation Deck
  if (compKey.includes('presentation') || compKey.includes('board') || compKey.includes('slide') || compKey === 'executivepresentationwidget') {
    return <ExecutivePresentationWidget {...props} />;
  }

  // 9. Root Cause Analysis (RCA) & Fault Tree Synthesis
  if (compKey.includes('rca') || compKey.includes('rootcause') || compKey.includes('faulttree') || compKey.includes('fishbone') || compKey === 'rootcauseanalysiswidget') {
    return <RootCauseAnalysisWidget {...props} />;
  }

  // 10. Tri-Model Autonomous Multi-Agent Consensus Debate
  if (compKey.includes('consensus') || compKey.includes('debate') || compKey.includes('tri-model') || compKey.includes('triagent') || compKey === 'multiagentconsensuswidget') {
    return <MultiAgentConsensusWidget {...props} />;
  }

  // 11. ISA-18.2 / EEMUA 191 Intelligent Alarm Flood Rationalization
  if (compKey.includes('alarm') || compKey.includes('flood') || compKey.includes('firstout') || compKey.includes('rationalization') || compKey === 'alarmrationalizationwidget') {
    return <AlarmRationalizationWidget {...props} />;
  }

  // 12. Plant Digital Twin (Refinery Mass-Energy Balance & Process Flow)
  if (compKey.includes('digitaltwin') || compKey.includes('refinery') || compKey.includes('plant') || compKey.includes('distillation') || compKey === 'plantdigitaltwinwidget') {
    return <PlantDigitalTwinWidget {...props} />;
  }

  // 13. HAZOP & LOPA SIL Functional Safety Workbench (IEC 61508 / 61511)
  if (compKey.includes('hazop') || compKey.includes('lopa') || compKey.includes('sil') || compKey.includes('protectionlayer') || compKey === 'hazoplopaworkbench') {
    return <HazopLopaWorkbench {...props} />;
  }

  // 14. API 521 Flare Network & Atmospheric Emission Dispersion
  if (compKey.includes('flare') || compKey.includes('emission') || compKey.includes('dispersion') || compKey.includes('radiation') || compKey === 'flarenetworkemissionwidget') {
    return <FlareNetworkEmissionWidget {...props} />;
  }

  // 15. Refinery Turnaround (TAR) & CPM Schedule Optimization
  if (compKey.includes('turnaround') || compKey.includes('cpm') || compKey.includes('shutdown') || compKey.includes('gantt') || compKey === 'turnaroundschedulerwidget') {
    return <TurnaroundSchedulerWidget {...props} />;
  }

  // 16. API 617 / ASME PTC 10 Compressor Anti-Surge & Aerodynamic Performance
  if (compKey.includes('compressor') || compKey.includes('surge') || compKey.includes('antisurge') || compKey === 'compressorantisurgewidget') {
    return <CompressorAntiSurgeWidget {...props} />;
  }

  // 17. ASME PTC 6 & IAPWS-IF97 Steam Turbine Cogeneration & Enthalpy-Entropy Engine
  if (compKey.includes('steamturbine') || compKey.includes('turbine') || compKey.includes('cogen') || compKey.includes('mollier') || compKey === 'steamturbinecogenwidget') {
    return <SteamTurbineCogenWidget {...props} />;
  }

  // Fallback: If unknown, render a clean parameter card
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono space-y-2">
      <div className="font-bold text-slate-800 dark:text-zinc-200">
        Component: {component}
      </div>
      <pre className="text-[10px] text-slate-600 dark:text-zinc-400 overflow-x-auto">
        {JSON.stringify(props, null, 2)}
      </pre>
    </div>
  );
}
