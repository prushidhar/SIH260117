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
import WeibullRulCard from './components/WeibullRulCard';
import PinchNetworkCard from './components/PinchNetworkCard';
import FatigueMinerCard from './components/FatigueMinerCard';
import WaterHammerCard from './components/WaterHammerCard';
import OrificeFlowmeterCard from './components/OrificeFlowmeterCard';
import RbiRiskMatrixCard from './components/RbiRiskMatrixCard';

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

  // 9. Weibull Fault Prognostics & RUL Widget
  if (compKey.includes('weibull') || compKey.includes('rul') || compKey === 'weibullrulcard') {
    return <WeibullRulCard {...props} />;
  }

  // 10. Linnhoff Pinch & Exergy Network Widget
  if (compKey.includes('pinch') || compKey.includes('exergy') || compKey.includes('hen') || compKey === 'pinchnetworkcard') {
    return <PinchNetworkCard {...props} />;
  }

  // 11. Palmgren-Miner Cumulative Fatigue Integrity Widget
  if (compKey.includes('fatigue') || compKey.includes('miner') || compKey.includes('palmgren') || compKey === 'fatigueminercard') {
    return <FatigueMinerCard {...props} />;
  }

  // 12. Joukowsky Water Hammer & Transient Acoustic Surge Card
  if (compKey.includes('hammer') || compKey.includes('surge') || compKey === 'waterhammercard') {
    return <WaterHammerCard {...props} />;
  }

  // 13. ISO 5167 Orifice Differential Pressure Metrology Card
  if (compKey.includes('orifice') || compKey.includes('iso5167') || compKey === 'orificeflowmetercard') {
    return <OrificeFlowmeterCard {...props} />;
  }

  // 14. API 580 / API 581 Quantitative RBI 5x5 Risk Matrix Card
  if (compKey.includes('rbi') || compKey.includes('risk_matrix') || compKey.includes('riskmatrix') || compKey === 'rbiriskmatrixcard') {
    return <RbiRiskMatrixCard {...props} />;
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
