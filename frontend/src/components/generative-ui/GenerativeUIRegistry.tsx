'use client';

import React from 'react';
import IndustrialGauge from './components/IndustrialGauge';
import TelemetryChart from './components/TelemetryChart';
import ParameterControlForm from './components/ParameterControlForm';
import EquipmentHealthCard from './components/EquipmentHealthCard';
import ASMEComplianceCard from './components/ASMEComplianceCard';
import DynamicSandboxWidget from './components/DynamicSandboxWidget';

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

  // 6. Dynamic Sandbox Widget (AI on-the-fly code)
  if (compKey.includes('sandbox') || compKey.includes('widget') || compKey.includes('code') || compKey === 'dynamicsandboxwidget' || props.code || props.html) {
    return <DynamicSandboxWidget {...props} />;
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
