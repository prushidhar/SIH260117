/**
 * Generative UI (Server-Driven Micro-Frontends) Type Definitions
 */

export type GenerativeUIComponentType =
  | 'IndustrialGauge'
  | 'TelemetryChart'
  | 'ParameterControlForm'
  | 'EquipmentHealthCard'
  | 'ASMEComplianceCard'
  | 'DynamicSandboxWidget'
  | 'InteractivePIDWidget'
  | 'ExecutivePresentationWidget'
  | 'WeibullRulCard'
  | 'PinchNetworkCard'
  | 'FatigueMinerCard'
  | 'WaterHammerCard'
  | 'OrificeFlowmeterCard'
  | 'RbiRiskMatrixCard'
  | 'CryogenicBlowdownCard'
  | 'RotorDynamicsCard'
  | 'HazardousAreaExCard'
  | 'AlarmTriageWidget'
  | string;

export interface GenerativeUISpec {
  id?: string;
  component: GenerativeUIComponentType;
  title?: string;
  props: Record<string, any>;
  rawJson?: string;
  status?: 'streaming' | 'ready' | 'error';
}

// 1. Industrial Gauge Props
export interface IndustrialGaugeProps {
  tag?: string;
  title?: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  thresholds?: {
    normal?: number;
    warning?: number;
    critical?: number;
  };
  status?: 'optimal' | 'warning' | 'critical';
  subtitle?: string;
  allowTesting?: boolean;
}

// 2. Telemetry Chart Props
export interface TelemetryDataPoint {
  timestamp: string;
  value: number;
  channel?: string;
  threshold?: number;
}

export interface TelemetryChannel {
  id: string;
  name: string;
  unit: string;
  color: string;
  data: TelemetryDataPoint[];
  normalMax: number;
  criticalMax: number;
}

export interface TelemetryChartProps {
  tag?: string;
  title?: string;
  subtitle?: string;
  channels?: TelemetryChannel[];
  series?: TelemetryDataPoint[]; // fallback single channel
  unit?: string;
  isoClass?: 'Class I' | 'Class II' | 'Class III' | 'Class IV';
  liveUpdate?: boolean;
}

// 3. Parameter Control Form Props
export interface ControlParameter {
  id: string;
  label: string;
  type: 'slider' | 'toggle' | 'select' | 'number';
  value: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
  description?: string;
  isHazardous?: boolean;
}

export interface ParameterControlFormProps {
  tag?: string;
  title?: string;
  subtitle?: string;
  parameters: ControlParameter[];
  equipmentMode?: 'MANUAL' | 'AUTO' | 'CASCADE' | 'STANDBY';
  onApply?: (newParams: Record<string, any>) => void;
  requireHITL?: boolean;
}

// 4. Equipment Health Card Props
export interface EquipmentHealthCardProps {
  tag: string;
  name: string;
  type: string;
  healthScore: number; // 0 - 100
  mtbfHours?: number;
  operatingHours?: number;
  lastInspectionDate?: string;
  subsystems?: {
    name: string;
    health: number;
    status: 'good' | 'fair' | 'critical';
    metric?: string;
  }[];
  criticalAlerts?: string[];
}

// 5. ASME Compliance Card Props
export interface ASMEComplianceCardProps {
  tag?: string;
  title?: string;
  standard?: string;
  initialPressure?: number; // psig
  diameter?: number; // inches
  allowableStress?: number; // psi
  corrosionAllowance?: number; // inches
  actualThickness?: number; // inches
  designTemp?: number; // F
  corrosionRate?: number; // in/yr
}

// 6. Dynamic Sandbox Widget Props
export interface DynamicSandboxWidgetProps {
  title?: string;
  subtitle?: string;
  code?: string;
  html?: string;
  initialData?: Record<string, any>;
}

// 7. Weibull RUL Prognostics Props
export interface WeibullRulCardProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  coxMultiplier?: number;
  rulDays?: number;
  turnaroundDays?: number;
  failureRisk90d?: number;
  mtbfHours?: number;
  betaShape?: number;
  effectiveAgeHours?: number;
  vibrationDelta?: number;
  bearingTemp?: number;
  bearingTempDelta?: number;
  recommendation?: string;
}

// 8. Linnhoff Pinch & Exergy Network Props
export interface PinchNetworkCardProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  recoveredHeatMW?: number;
  recoveryPercent?: number;
  deltaTMin?: number;
  pinchHotTemp?: number;
  pinchColdTemp?: number;
  annualSavingsUSD?: string;
  avoidedCarbonTonnes?: string;
  exergeticEfficiency?: number;
  exergyDestructionMW?: number;
  hotUtilityMinMW?: number;
  coldUtilityMinMW?: number;
}

// 9. Palmgren-Miner Cumulative Fatigue Props
export interface StressBlockItem {
  blockId: string;
  description: string;
  stressRangeMPa: number;
  meanStressMPa: number;
  cyclesApplied: number;
  cyclesAllowable: number;
  damageFraction: number;
}

export interface FatigueMinerCardProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  cumulativeDamage?: number;
  remainingMarginPercent?: number;
  estimatedLifeYears?: number;
  stressBlocks?: StressBlockItem[];
}

// 10. Joukowsky Water Hammer & Surge Shock Props
export interface WaterHammerCardProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  steadyPressureBar?: number;
  peakSurgePressureBar?: number;
  allowableSurgeCeilingBar?: number;
  initialClosureTimeSec?: number;
  criticalPipePeriodSec?: number;
  accumulatorVolumeM3?: number;
  kineticEnergyMJ?: number;
  recommendedClosureSec?: number;
  waveSpeedMs?: number;
  pipelineLengthKm?: number;
}

// 11. ISO 5167 Orifice Differential Pressure Metrology Props
export interface OrificeFlowmeterCardProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  differentialPressureMbar?: number;
  massFlowRateTph?: number;
  massFlowRateKgs?: number;
  volumetricFlowM3h?: number;
  dischargeCoefficient?: number;
  pipeReynoldsNumber?: number;
  permanentHeadLossKpa?: number;
  powerDissipationKw?: number;
  orificeBoreMm?: number;
  pipeDiameterMm?: number;
  diameterRatioBeta?: number;
  flangeRating?: string;
}

// 12. API 580 / 581 Quantitative RBI 5x5 Risk Matrix Props
export interface RbiRiskMatrixCardProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  activePofCategory?: number; // 1 to 5
  activeCofCategory?: string; // 'A' to 'E'
  multiMechanismDamageFactor?: number;
  thinningDamageFactor?: number;
  h2sSourDamageFactor?: number;
  cuiDamageFactor?: number;
  flammableReleaseAreaM2?: number;
  financialConsequenceUsd?: number;
  expectedAnnualizedLossUsd?: number;
  targetIntervalYears?: number;
  nextPmWindow?: string;
  mandatoryMitigationTechnique?: string;
}

// 13. API 521 Cryogenic Blowdown & MDMT Brittle Fracture Props
export interface CryogenicBlowdownCardProps {
  assetTag?: string;
  title?: string;
  initialPressureBar?: number;
  finalPressureBar?: number;
  target15MinPressureBar?: number;
  minFluidTempC?: number;
  minWallTempC?: number;
  vesselMdmtC?: number;
  materialSpec?: string;
  asmeCurve?: string;
  durationMinutes?: number;
}

// 14. API 684 Rotordynamics & Campbell Diagram Props
export interface RotorDynamicsCardProps {
  assetTag?: string;
  title?: string;
  operatingSpeedRpm?: number;
  maxContinuousSpeedRpm?: number;
  tripSpeedRpm?: number;
  firstCriticalSpeedRpm?: number;
  firstCriticalFreqHz?: number;
  firstSeparationMarginPercent?: number;
  secondCriticalSpeedRpm?: number;
  secondCriticalFreqHz?: number;
  secondSeparationMarginPercent?: number;
  misalignmentRatio2X1X?: number;
  bearingDerateFactor?: number;
  vanePassMultiplier?: number;
}

// 15. IEC 60079 Hazardous Area Explosion Proof Props
export interface HazardousAreaExCardProps {
  assetTag?: string;
  title?: string;
  measuredJointGapMm?: number;
  allowableJointGapMm?: number;
  measuredSurfaceTempC?: number;
  tClassLimitTempC?: number;
  tClassRating?: string;
  hydrogenAitC?: number;
  ingressProtection?: string;
  certificationStamp?: string;
}

// 16. ISA 18.2 / EEMUA 191 Control Room Alarm Flood & Triage Props
export interface AlarmTriageItem {
  tag: string;
  description: string;
  parentTag?: string;
  time: string;
  suppressionType: string;
}

export interface ChatteringAlarmItem {
  tag: string;
  description: string;
  count: number;
  deadbandHysteresis: string;
  status: string;
}

export interface AlarmTriageWidgetProps {
  title?: string;
  currentAlarmRate10Min?: number;
  totalReceived?: number;
  actionableRootCauseCount?: number;
  consequentialSuppressedCount?: number;
  chatteringDebouncedCount?: number;
  firstOutTag?: string;
  firstOutDescription?: string;
  suppressedAlarms?: AlarmTriageItem[];
  chatteringAlarms?: ChatteringAlarmItem[];
}


