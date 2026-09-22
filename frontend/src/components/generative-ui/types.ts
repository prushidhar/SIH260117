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
