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
import CryogenicBlowdownCard from './components/CryogenicBlowdownCard';
import RotorDynamicsCard from './components/RotorDynamicsCard';
import HazardousAreaExCard from './components/HazardousAreaExCard';
import AlarmTriageWidget from './components/AlarmTriageWidget';
import CompressorAntiSurgeWidget from './components/CompressorAntiSurgeWidget';
import SteamTurbineCogenWidget from './components/SteamTurbineCogenWidget';
import CathodicProtectionCuiWidget from './components/CathodicProtectionCuiWidget';
import CoolingTowerPsychrometricWidget from './components/CoolingTowerPsychrometricWidget';
import TegDehydrationWidget from './components/TegDehydrationWidget';
import ReliefValveSizingWidget from './components/ReliefValveSizingWidget';
import RootCauseAnalysisWidget from './components/RootCauseAnalysisWidget';
import SensorDriftFddCard from './components/SensorDriftFddCard';
import HazopMatrixWidget from './components/HazopMatrixWidget';
import ArcFlashHazardCard from './components/ArcFlashHazardCard';
import AcidDewPointMeter from './components/AcidDewPointMeter';
import CompressorTrainCard from './components/CompressorTrainCard';
import FunctionalSafetyCard from './components/FunctionalSafetyCard';
import FlareAivCard from './components/FlareAivCard';
import ProximityProbeCard from './components/ProximityProbeCard';
import PipingFlexibilityCard from './components/PipingFlexibilityCard';
import FinFanCoolerCard from './components/FinFanCoolerCard';
import HazardousAreaCard from './components/HazardousAreaCard';

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

  // 2. Telemetry Line/Area Chart & 30Hz FFT Spectrum
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
  if (compKey.includes('asme') || compKey.includes('compliance') || compKey.includes('thickness') || compKey === 'asmecompliancecard') {
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

  // 15. API 521 Cryogenic Blowdown & MDMT Brittle Fracture Card
  if (compKey.includes('blowdown') || compKey.includes('depressur') || compKey === 'cryogenicblowdowncard') {
    return <CryogenicBlowdownCard {...props} />;
  }

  // 16. API 684 Rotordynamics & Campbell Diagram Card
  if (compKey.includes('rotordynamic') || compKey.includes('critical_speed') || compKey === 'rotordynamicscard') {
    return <RotorDynamicsCard {...props} />;
  }

  // 17. IEC 60079-10-1 & API RP 505 Hazardous Area Classification & Gas Dispersion Card
  if (compKey === 'hazardousareacard' || compKey === 'hazardous_area_card' || compKey.includes('hac') || compKey.includes('dispersion') || compKey.includes('api505') || compKey.includes('60079-10') || compKey === 'hazardous_area') {
    return <HazardousAreaCard {...props} />;
  }

  // 17b. IEC 60079 Hazardous Area Explosion Proof (Flameproof Ex d) Card
  if (compKey.includes('flameproof') || compKey === 'hazardousareaexcard') {
    return <HazardousAreaExCard {...props} />;
  }

  // 18. ISA 18.2 / EEMUA 191 Control Room Alarm Flood & Triage Widget
  if (compKey.includes('triage') || compKey.includes('alarm') || compKey === 'alarmtriagewidget') {
    return <AlarmTriageWidget {...props} />;
  }

  // 19. API 617 Centrifugal Compressor Anti-Surge Map
  if (compKey.includes('antisurge') || compKey.includes('anti-surge') || compKey.includes('compressor_map') || compKey === 'compressorantisurgewidget') {
    return <CompressorAntiSurgeWidget {...props} />;
  }

  // 20. ASME PTC 6 Steam Turbine Extraction-Condensing Cogeneration Balance
  if (compKey.includes('cogen') || compKey.includes('steamturbine') || compKey.includes('steam_turbine') || compKey.includes('ptc6') || compKey === 'steamturbinecogenwidget') {
    return <SteamTurbineCogenWidget {...props} />;
  }

  // 21. NACE SP0169 & API 581 Cathodic Protection & CUI Tracker
  if (compKey.includes('cathodic') || compKey.includes('cui') || compKey.includes('nace') || compKey === 'cathodicprotectioncuiwidget') {
    return <CathodicProtectionCuiWidget {...props} />;
  }

  // 22. CTI ATC-105 Cooling Tower Psychrometric Calculator
  if (compKey.includes('coolingtower') || compKey.includes('cooling_tower') || compKey.includes('psychrometric') || compKey.includes('atc105') || compKey === 'coolingtowerpsychrometricwidget') {
    return <CoolingTowerPsychrometricWidget {...props} />;
  }

  // 23. GPSA Sec 20 Glycol (TEG) Dehydration System
  if (compKey.includes('glycol') || compKey.includes('dehydration') || compKey.includes('teg') || compKey === 'tegdehydrationwidget') {
    return <TegDehydrationWidget {...props} />;
  }

  // 24. API 520 / API 526 Pressure Relief Valve (PSV) Sizing
  if (compKey.includes('psv') || compKey.includes('relief') || compKey.includes('api520') || compKey.includes('api526') || compKey === 'reliefvalvesizingwidget') {
    return <ReliefValveSizingWidget {...props} />;
  }

  // 25. Industrial Root Cause Analysis (RCA) Multi-Tab Suite
  if (compKey.includes('rca') || compKey.includes('rootcause') || compKey.includes('root_cause') || compKey.includes('fishbone') || compKey.includes('faulttree') || compKey.includes('fault_tree') || compKey.includes('bowtie') || compKey === 'rootcauseanalysiswidget') {
    return <RootCauseAnalysisWidget {...props} />;
  }

  // 26. ISO 13374 Condition Monitoring, Sensor Drift & Fault Diagnostics
  if (compKey.includes('sensor_drift') || compKey.includes('sensordrift') || compKey.includes('fdd') || compKey.includes('calibration') || compKey.includes('iso13374') || compKey === 'sensordriftfddcard') {
    return <SensorDriftFddCard {...props} />;
  }

  // 27. Autonomous IEC 61882 HAZOP Deviation Matrix
  if (compKey.includes('hazop') || compKey.includes('hazop_matrix') || compKey.includes('pha_study') || compKey === 'hazopmatrixwidget') {
    return <HazopMatrixWidget {...props} />;
  }

  // 28. IEEE 1584-2018 Arc Flash & NFPA 70E Electrical Safety
  if (compKey.includes('arc_flash') || compKey.includes('arcflash') || compKey.includes('ieee1584') || compKey.includes('nfpa70e') || compKey === 'arcflashhazardcard') {
    return <ArcFlashHazardCard {...props} />;
  }

  // 29. ASME PTC 4.3 Flue Gas Acid Dew Point & Cold-End Integrity
  if (compKey.includes('acid_dew_point') || compKey.includes('aciddewpoint') || compKey.includes('ptc43') || compKey.includes('ptc_4_3') || compKey.includes('air_preheater') || compKey.includes('cold_end') || compKey === 'aciddewpointmeter') {
    return <AcidDewPointMeter {...props} />;
  }

  // 30. API 617 Multi-Stage Centrifugal Compressor Train Performance
  if (compKey.includes('multistage_compressor') || compKey.includes('compressor_train') || compKey.includes('api617_train') || compKey.includes('compressortrain') || compKey === 'compressortraincard') {
    return <CompressorTrainCard {...props} />;
  }

  // 31. ISO 13849-1 Machinery Functional Safety Integrity
  if (compKey.includes('iso13849') || compKey.includes('functional_safety_pl') || compKey.includes('functional_safety') || compKey.includes('iec62061') || compKey.includes('functionalsafety') || compKey === 'functionalsafetycard') {
    return <FunctionalSafetyCard {...props} />;
  }

  // 32. API 520 Part II & EEMUA 158 Flare Acoustical Vibration (AIV)
  if (compKey.includes('flare_aiv') || compKey.includes('api520_aiv') || compKey.includes('acoustic_vibration') || compKey.includes('flareaiv') || compKey.includes('aiv') || compKey === 'flareaivcard') {
    return <FlareAivCard {...props} />;
  }

  // 33. API Standard 670 Machinery Protection & Proximity Probes
  if (compKey.includes('api670') || compKey.includes('proximity_probe') || compKey.includes('bently_nevada') || compKey.includes('shaft_orbit') || compKey.includes('proximityprobe') || compKey === 'proximityprobecard') {
    return <ProximityProbeCard {...props} />;
  }

  // 34. ASME B31.3 § 319 / Appendix X Piping Flexibility & Thermal Expansion Loop
  if (compKey.includes('piping_flexibility') || compKey.includes('expansion_loop') || compKey.includes('asme_b313') || compKey.includes('flexibility') || compKey.includes('thermal_expansion') || compKey === 'pipingflexibilitycard') {
    return <PipingFlexibilityCard {...props} />;
  }

  // 35. API Standard 661 / ISO 13706 Air-Cooled Heat Exchanger (Fin-Fan Cooler)
  if (compKey.includes('fin_fan') || compKey.includes('finfan') || compKey.includes('air_cooler') || compKey.includes('air_cooled_exchanger') || compKey.includes('api661') || compKey === 'finfancoolercard') {
    return <FinFanCoolerCard {...props} />;
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
