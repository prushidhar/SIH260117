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
  | 'CompressorAntiSurgeWidget'
  | 'SteamTurbineCogenWidget'
  | 'CathodicProtectionCuiWidget'
  | 'CoolingTowerPsychrometricWidget'
  | 'TegDehydrationWidget'
  | 'ReliefValveSizingWidget'
  | 'RootCauseAnalysisWidget'
  | 'SensorDriftFddCard'
  | 'HazopMatrixWidget'
  | 'ArcFlashHazardCard'
  | 'AcidDewPointMeter'
  | 'CompressorTrainCard'
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

// 17. API 617 Centrifugal Compressor Anti-Surge Map Props
export interface CompressorAntiSurgeWidgetProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  suctionPressureBar?: number;
  dischargePressureBar?: number;
  operatingFlowM3h?: number;
  designFlowM3h?: number;
  operatingSpeedRpm?: number;
  ratedSpeedRpm?: number;
  asvValveTravelPercent?: number;
  surgeMarginPercent?: number;
  polytropicHeadKjKg?: number;
  polytropicEfficiencyPercent?: number;
}

// 18. ASME PTC 6 Steam Turbine Extraction-Condensing Cogeneration Balance Props
export interface SteamTurbineCogenWidgetProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  throttleInletFlowTph?: number;
  throttlePressureBar?: number;
  throttleTempC?: number;
  extractionFlowTph?: number;
  extractionPressureBar?: number;
  exhaustPressureBar?: number;
  electricalPowerMwe?: number;
  thermalDutyMwth?: number;
  specificSteamConsumptionKgKwh?: number;
  isentropicEfficiencyPercent?: number;
}

// 19. NACE SP0169 & API 581 Cathodic Protection & CUI Tracker Props
export interface CathodicProtectionCuiWidgetProps {
  assetTag?: string;
  title?: string;
  pipeToSoilPotentialMv?: number; // e.g. -940 mV vs -850 mV criterion
  criterionMv?: number;
  anodeCurrentAmps?: number;
  rectifierVoltageVolts?: number;
  operatingTempC?: number;
  cuiZoneMinC?: number; // 50 C
  cuiZoneMaxC?: number; // 150 C
  insulationType?: string;
  cuiRiskScore?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  api581PofCategory?: number; // 1-5
  api581CofCategory?: string; // A-E
}

// 20. CTI ATC-105 Cooling Tower Psychrometric Calculator Props
export interface CoolingTowerPsychrometricWidgetProps {
  assetTag?: string;
  title?: string;
  dryBulbTempC?: number;
  relativeHumidityPercent?: number;
  coldWaterSupplyTempC?: number;
  hotWaterReturnTempC?: number;
  circulatingWaterFlowM3h?: number;
  cyclesOfConcentration?: number;
  coolingDutyMw?: number;
  evaporationRateM3h?: number;
  blowdownRateM3h?: number;
  driftLossPercent?: number;
}

// 21. GPSA Sec 20 Glycol (TEG) Dehydration System Props
export interface TegDehydrationWidgetProps {
  assetTag?: string;
  title?: string;
  gasInletFlowMmscfd?: number;
  gasInletPressureBar?: number;
  gasInletTempC?: number;
  richGlycolConcentrationPercent?: number;
  leanGlycolConcentrationPercent?: number;
  reboilerTempC?: number;
  reboilerDutyKw?: number;
  waterDewPointC?: number;
  waterContentLbsMmscf?: number;
  glycolCirculationRateGpm?: number;
}

// 22. API 520 / API 526 Pressure Relief Valve (PSV) Sizing Props
export interface ReliefValveSizingWidgetProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  selectedOrificeLetter?: string; // e.g. 'J'
  requiredAreaIn2?: number;
  effectiveAreaIn2?: number;
  setPressureBarg?: number;
  relievingPressureBarg?: number;
  allowableAccumulationPercent?: number; // 10%, 16%, 21%
  backPressureBarg?: number;
  certifiedCapacityKgH?: number;
  requiredRelievingCapacityKgH?: number;
  flowRegime?: 'CHOKED_CRITICAL' | 'SUBSONIC';
  fluidType?: string;
}

// 23. Industrial Root Cause Analysis (RCA) Multi-Tab Suite Props
export interface FaultTreeNode {
  id: string;
  label: string;
  type: 'TOP_EVENT' | 'AND_GATE' | 'OR_GATE' | 'BASIC_EVENT';
  probability?: number;
  children?: string[];
  description?: string;
}

export interface FiveWhyStep {
  step: number;
  why: string;
  finding: string;
  evidence: string;
}

export interface BowTieBarrier {
  id: string;
  type: 'PREVENTIVE' | 'MITIGATIVE';
  name: string;
  status: 'EFFECTIVE' | 'DEGRADED' | 'FAILED';
  verificationDate: string;
}

export interface IshikawaCategory {
  category: 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Man' | 'Environment';
  causes: string[];
}

export interface RootCauseAnalysisWidgetProps {
  assetTag?: string;
  title?: string;
  incidentId?: string;
  incidentDate?: string;
  topEventDescription?: string;
  defaultTab?: 'fta' | '5why' | 'bowtie' | 'fishbone';
  faultTreeNodes?: FaultTreeNode[];
  fiveWhySteps?: FiveWhyStep[];
  barriers?: BowTieBarrier[];
  ishikawaCategories?: IshikawaCategory[];
}

// 26. ISO 13374 Condition Monitoring, Sensor Drift & Fault Diagnostics
export interface SensorSamplePoint {
  sampleIndex: number;
  timestamp: string;
  nominalValue: number;
  measuredPrimary: number; // TT-101
  measuredRedundant: number; // TT-101B
  driftValue: number;
  driftVelocity: number;
}

export interface SensorDriftFddCardProps {
  assetTag?: string; // Default: 'CDU-104'
  sensorTag?: string; // Default: 'TT-101'
  redundantTag?: string; // Default: 'TT-101B'
  title?: string;
  spanMin?: number; // 0
  spanMax?: number; // 300
  unit?: string; // '°C'
  statutoryLimitPct?: number; // ±2.0%
  samples?: SensorSamplePoint[];
  initialDriftOffset?: number;
  initialDriftRate?: number;
  redundancyDiscrepancyMae?: number;
  sensorReliabilityIndex?: number;
}

// 27. Autonomous IEC 61882 HAZOP Deviation Matrix
export interface HazopItem {
  id: string;
  guideWord: string; // MORE, LESS, NO, REVERSE, AS WELL AS, PART OF, OTHER THAN
  parameter: 'FLOW' | 'PRESSURE' | 'TEMPERATURE' | 'COMPOSITION' | 'LEVEL' | string;
  deviation: string;
  causes: string[];
  consequences: string[];
  safeguards: string[];
  severity: number; // 1 - 5
  likelihood: number; // 1 - 5
  riskScore: number; // S * L
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  capaAction: string;
  status?: 'OPEN' | 'ASSIGNED' | 'VERIFIED';
}

export interface HazopMatrixWidgetProps {
  assetTag?: string;
  title?: string;
  standard?: string;
  studyId?: string;
  sha256Seal?: string;
  deviations?: HazopItem[];
}

// 28. IEEE 1584-2018 Arc Flash & NFPA 70E Electrical Safety
export interface ArcFlashHazardCardProps {
  assetTag?: string; // Default: 'SWGR-6.6KV-01'
  location?: string; // Default: '6.6 kV MV SUBSTATION'
  title?: string;
  systemVoltageKv?: number; // 6.6 kV
  boltedFaultCurrentKa?: number; // 25.0 kA
  clearingTimeSec?: number; // 0.20 s
  workingDistanceMm?: number; // 914 mm (36 in)
  electrodeConfig?: 'VCB' | 'VCBB' | 'HCB' | 'VOA' | 'HOA';
  gapMm?: number; // 104 mm for MV switchgear
  restrictedBoundaryMm?: number; // 700 mm
  limitedBoundaryMm?: number; // 1500 mm
}

// 29. ASME PTC 4.3 Flue Gas Acid Dew Point & Cold-End Integrity
export interface AcidDewPointMeterProps {
  assetTag?: string; // Default: 'F-101 / APH-101'
  equipmentName?: string; // Default: 'Fired Heater / Rotary Air Preheater'
  title?: string;
  fuelSulfurWtPct?: number; // Default: 2.2 wt% (0.1 to 4.5)
  flueGasO2Pct?: number; // Default: 3.5 % (1.0 to 8.0)
  coldEndMetalTempC?: number; // Default: 155.0 °C (100 to 200)
  flueGasMoisturePct?: number; // Default: 12.0 % vol
  flueGasTempInC?: number; // Default: 340.0 °C
  ambientAirTempC?: number; // Default: 25.0 °C
  materialSpec?: string; // Default: 'Corten Steel / Carbon Steel'
}

// 30. API 617 Multi-Stage Centrifugal Compressor Train Performance
export interface CompressorTrainStage {
  stageNumber: number;
  suctionPressureBar: number;
  dischargePressureBar: number;
  pressureRatio: number;
  suctionTempC: number;
  dischargeTempC: number;
  polytropicHeadKjKg: number;
  powerDemandKw: number;
  exceedsThermalLimit: boolean;
}

export interface CompressorTrainCardProps {
  assetTag?: string; // Default: 'K-103'
  trainName?: string; // Default: 'K-103 FLASH GAS'
  title?: string;
  suctionPressureBar?: number; // 2.2 bar a
  dischargePressureBar?: number; // 15.4 bar a
  massFlowTh?: number; // 42.5 t/h
  intercoolerOutletTempC?: number; // 40.0 °C
  polytropicEfficiencyPct?: number; // 82.0 %
  gasMolecularWeight?: number; // 28.5 kg/kmol
  specificHeatRatio?: number; // 1.26
  maxAllowableTempC?: number; // 135.0 °C per API 617
}





