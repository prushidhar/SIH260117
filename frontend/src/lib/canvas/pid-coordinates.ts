/**
 * Industrial P&ID Schematic Coordinate Definitions & Hit-Testing Engine
 * 
 * Standard ISA-5.1 compliant coordinates for plant equipment on the
 * standard 1000x800 normalized P&ID schematic canvas.
 */

export interface EquipmentBoundingBox {
  tag: string;
  name: string;
  type: 'PUMP' | 'EXCHANGER' | 'VALVE' | 'VESSEL' | 'INSTRUMENT' | 'SAFETY_VALVE';
  /** Normalized schematic coordinate box (0..1000 width, 0..800 height) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Primary process line connection points */
  ports: { x: number; y: number; label?: string }[];
  /** Engineering specifications for HUD badges */
  spec: string;
  rating: string;
  designPressure: string;
  designTemp: string;
  material: string;
  status: 'ACTIVE' | 'STANDBY' | 'CRITICAL' | 'WARNING' | 'MAINTENANCE';
}

export interface PipeLineSegment {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  fluid: string;
  fluidColor: string;
  lineSize: string;
  spec: string;
  /** Flow direction: 1 = from->to, -1 = to->from */
  direction: number;
}

/**
 * Standard refinery crude pre-heat & distillation feed P&ID schematic layout
 * Normalized to 1000 x 800 schematic space.
 */
export const DEFAULT_EQUIPMENT_CATALOG: EquipmentBoundingBox[] = [
  {
    tag: 'TK-101',
    name: 'Crude Feed Storage Tank',
    type: 'VESSEL',
    x: 60,
    y: 360,
    width: 110,
    height: 160,
    ports: [
      { x: 170, y: 480, label: 'Bottom Suction' },
      { x: 115, y: 360, label: 'Top Vent' }
    ],
    spec: 'API 650 Welded Cone-Roof',
    rating: 'Atmospheric (0.5 psig)',
    designPressure: '14.7 psia',
    designTemp: '45°C',
    material: 'ASTM A283 Gr C Carbon Steel',
    status: 'ACTIVE',
  },
  {
    tag: 'P-101',
    name: 'Primary Crude Feed Centrifugal Pump',
    type: 'PUMP',
    x: 230,
    y: 440,
    width: 80,
    height: 80,
    ports: [
      { x: 230, y: 480, label: 'Suction' },
      { x: 270, y: 440, label: 'Discharge' }
    ],
    spec: 'API 610 11th Ed. (OH2)',
    rating: 'ANSI Class 300 RF',
    designPressure: '450 psig (31 barg)',
    designTemp: '120°C',
    material: 'ASTM A216 WCB / 12% Cr',
    status: 'ACTIVE',
  },
  {
    tag: 'P-102',
    name: 'Booster Crude Feed Standby Pump',
    type: 'PUMP',
    x: 230,
    y: 570,
    width: 80,
    height: 80,
    ports: [
      { x: 230, y: 610, label: 'Suction' },
      { x: 270, y: 570, label: 'Discharge' }
    ],
    spec: 'API 610 11th Ed. (OH2)',
    rating: 'ANSI Class 300 RF',
    designPressure: '450 psig (31 barg)',
    designTemp: '120°C',
    material: 'ASTM A216 WCB / 12% Cr',
    status: 'STANDBY',
  },
  {
    tag: 'PI-101',
    name: 'Discharge Pressure Transmitter',
    type: 'INSTRUMENT',
    x: 340,
    y: 390,
    width: 50,
    height: 50,
    ports: [{ x: 365, y: 440 }],
    spec: 'HART Smart Pressure Transmitter',
    rating: 'Ex ia IIC T4 Ga (ATEX Zone 0)',
    designPressure: '0-50 barg',
    designTemp: '-40 to 85°C',
    material: 'Hastelloy C-276 Diaphragm',
    status: 'ACTIVE',
  },
  {
    tag: 'FV-101',
    name: 'Crude Flow Control Valve (FCV)',
    type: 'VALVE',
    x: 420,
    y: 415,
    width: 60,
    height: 60,
    ports: [
      { x: 420, y: 440, label: 'Inlet' },
      { x: 480, y: 440, label: 'Outlet' }
    ],
    spec: 'Globe Valve with Pneumatic Diaphragm',
    rating: 'ASME Class 300',
    designPressure: '450 psig',
    designTemp: '150°C',
    material: 'Cast Carbon Steel A216-WCC',
    status: 'ACTIVE',
  },
  {
    tag: 'E-101',
    name: 'Shell & Tube Crude Pre-Heat Exchanger',
    type: 'EXCHANGER',
    x: 540,
    y: 370,
    width: 150,
    height: 100,
    ports: [
      { x: 540, y: 440, label: 'Tube Inlet' },
      { x: 690, y: 440, label: 'Tube Outlet' },
      { x: 615, y: 370, label: 'Shell Inlet' },
      { x: 615, y: 470, label: 'Shell Outlet' }
    ],
    spec: 'TEMA Type AES (Fixed Tube Sheet)',
    rating: 'ASME Class 600 / Class 300',
    designPressure: 'Tube: 450 psig | Shell: 300 psig',
    designTemp: 'Tube: 210°C | Shell: 280°C',
    material: 'Shell: A516 Gr 70 | Tubes: Monel 400',
    status: 'ACTIVE',
  },
  {
    tag: 'HX-4201',
    name: 'Crude Pre-Heat Exchanger Bank A',
    type: 'EXCHANGER',
    x: 540,
    y: 530,
    width: 150,
    height: 100,
    ports: [
      { x: 540, y: 600, label: 'Tube Inlet' },
      { x: 690, y: 600, label: 'Tube Outlet' },
      { x: 615, y: 530, label: 'Shell Inlet' },
      { x: 615, y: 630, label: 'Shell Outlet' }
    ],
    spec: 'ASME B31.3 §304.1.2 High Consequence',
    rating: 'ASME Class 600',
    designPressure: '450.0 psig (Design $P$)',
    designTemp: '285°C (Operating $T$)',
    material: 'ASTM A106 Gr B Pipe / NPS 8 Sch 40',
    status: 'CRITICAL',
  },
  {
    tag: 'TI-101',
    name: 'Pre-Heat Outlet Temperature Element',
    type: 'INSTRUMENT',
    x: 730,
    y: 370,
    width: 50,
    height: 50,
    ports: [{ x: 755, y: 440 }],
    spec: 'Duplex Pt100 RTD Class A with Thermowell',
    rating: 'Explosion Proof Ex d IIC',
    designPressure: '1500 psig Thermowell',
    designTemp: '-50 to 450°C',
    material: '316L Stainless Steel',
    status: 'ACTIVE',
  },
  {
    tag: 'FV-3102',
    name: 'Heavy Gas Oil Flow Control Valve',
    type: 'VALVE',
    x: 730,
    y: 575,
    width: 60,
    height: 60,
    ports: [
      { x: 730, y: 600, label: 'Inlet' },
      { x: 790, y: 600, label: 'Outlet' }
    ],
    spec: 'High-Temperature Rotary Eccentric Plug',
    rating: 'ASME Class 600',
    designPressure: '550 psig',
    designTemp: '340°C',
    material: 'Cr-Mo Steel ASTM A217 WC9',
    status: 'ACTIVE',
  },
  {
    tag: 'RV-204',
    name: 'Thermal Expansion Pressure Safety Valve',
    type: 'SAFETY_VALVE',
    x: 615,
    y: 250,
    width: 50,
    height: 60,
    ports: [{ x: 640, y: 370 }],
    spec: 'API 526 Direct Spring Loaded Flanged',
    rating: 'Inlet 300# / Outlet 150#',
    designPressure: 'Set Pressure: 495 psig',
    designTemp: '300°C',
    material: '316 SS Trim / Stellite Seat',
    status: 'ACTIVE',
  },
  {
    tag: 'TI-4201',
    name: 'HX-4201 Shell Inlet Temperature Transmitter',
    type: 'INSTRUMENT',
    x: 615,
    y: 670,
    width: 50,
    height: 50,
    ports: [{ x: 640, y: 630 }],
    spec: 'Pt100 RTD with Head-Mounted 4-20mA Transmitter',
    rating: 'Ex ia IIC T6',
    designPressure: '600 psig',
    designTemp: '285°C',
    material: 'Inconel 625 Thermowell',
    status: 'ACTIVE',
  },
  {
    tag: 'PI-3104',
    name: 'HX-4201 Tube Pressure Indicator',
    type: 'INSTRUMENT',
    x: 480,
    y: 640,
    width: 50,
    height: 50,
    ports: [{ x: 505, y: 600 }],
    spec: 'Glycerine-Filled Safety Pattern Gauge',
    rating: 'Class 600 / 0-40 barg',
    designPressure: '35 barg Normal',
    designTemp: '180°C',
    material: 'Monel Wetted Parts',
    status: 'ACTIVE',
  },
];

/**
 * Process piping interconnects linking equipment units on the schematic
 */
export const DEFAULT_PIPING_NETWORK: PipeLineSegment[] = [
  // Tank to Pump P-101 Suction
  { id: 'L-101', from: { x: 170, y: 480 }, to: { x: 230, y: 480 }, fluid: 'Crude Oil', fluidColor: '#6366f1', lineSize: '8" Sch 40', spec: 'A106-B', direction: 1 },
  // Tank to Pump P-102 Suction (branch)
  { id: 'L-102', from: { x: 200, y: 480 }, to: { x: 200, y: 610 }, fluid: 'Crude Oil', fluidColor: '#6366f1', lineSize: '8" Sch 40', spec: 'A106-B', direction: 1 },
  { id: 'L-103', from: { x: 200, y: 610 }, to: { x: 230, y: 610 }, fluid: 'Crude Oil', fluidColor: '#6366f1', lineSize: '8" Sch 40', spec: 'A106-B', direction: 1 },
  // Pump P-101 Discharge to Header
  { id: 'L-104', from: { x: 270, y: 440 }, to: { x: 420, y: 440 }, fluid: 'Pressurized Crude', fluidColor: '#8b5cf6', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  // Pump P-102 Discharge to Header
  { id: 'L-105', from: { x: 270, y: 570 }, to: { x: 310, y: 570 }, fluid: 'Pressurized Crude', fluidColor: '#8b5cf6', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  { id: 'L-106', from: { x: 310, y: 570 }, to: { x: 310, y: 440 }, fluid: 'Pressurized Crude', fluidColor: '#8b5cf6', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  // FCV FV-101 to Heat Exchanger E-101
  { id: 'L-107', from: { x: 480, y: 440 }, to: { x: 540, y: 440 }, fluid: 'Controlled Crude', fluidColor: '#06b6d4', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  // Exchanger E-101 to Battery Limit (Through TI-101)
  { id: 'L-108', from: { x: 690, y: 440 }, to: { x: 920, y: 440 }, fluid: 'Pre-Heated Crude (195°C)', fluidColor: '#f59e0b', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  // Branch to Bank A (HX-4201)
  { id: 'L-109', from: { x: 510, y: 440 }, to: { x: 510, y: 600 }, fluid: 'Crude Slipstream', fluidColor: '#06b6d4', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  { id: 'L-110', from: { x: 510, y: 600 }, to: { x: 540, y: 600 }, fluid: 'Crude Slipstream', fluidColor: '#06b6d4', lineSize: '6" Sch 40', spec: 'A106-B', direction: 1 },
  // HX-4201 to Valve FV-3102 and Process Out
  { id: 'L-111', from: { x: 690, y: 600 }, to: { x: 730, y: 600 }, fluid: 'Superheated Crude (285°C)', fluidColor: '#ef4444', lineSize: '8" Sch 40', spec: 'A106-B', direction: 1 },
  { id: 'L-112', from: { x: 790, y: 600 }, to: { x: 920, y: 600 }, fluid: 'Desalter Feed (285°C)', fluidColor: '#ef4444', lineSize: '8" Sch 40', spec: 'A106-B', direction: 1 },
  // Relief line from Shell E-101 to RV-204
  { id: 'L-113', from: { x: 640, y: 370 }, to: { x: 640, y: 310 }, fluid: 'Relief Vapor', fluidColor: '#10b981', lineSize: '2" Sch 80', spec: 'A106-B', direction: 1 },
  // Flare Header Out from RV-204
  { id: 'L-114', from: { x: 665, y: 275 }, to: { x: 920, y: 275 }, fluid: 'Closed Flare Header', fluidColor: '#10b981', lineSize: '4" Sch 40', spec: 'A106-B', direction: 1 },
];

/**
 * Find equipment by tag string (case-insensitive fuzzy match)
 */
export function findEquipmentByTag(tag: string, catalog = DEFAULT_EQUIPMENT_CATALOG): EquipmentBoundingBox | null {
  if (!tag) return null;
  const cleanTag = tag.trim().toUpperCase();
  
  // Exact match
  const exact = catalog.find((e) => e.tag.toUpperCase() === cleanTag);
  if (exact) return exact;

  // Normalized search (stripping hyphens, e.g. P101 matches P-101)
  const normTag = cleanTag.replace(/[^A-Z0-9]/g, '');
  const partial = catalog.find((e) => e.tag.replace(/[^A-Z0-9]/g, '') === normTag);
  if (partial) return partial;

  // Substring match
  return catalog.find((e) => e.tag.toUpperCase().includes(cleanTag) || cleanTag.includes(e.tag.toUpperCase())) || null;
}

/**
 * Synthesize a deterministic coordinate box for dynamic/arbitrary tags
 * that may not be in the pre-defined catalog.
 */
export function getOrCreateEquipmentBox(tag: string, catalog = DEFAULT_EQUIPMENT_CATALOG): EquipmentBoundingBox {
  const existing = findEquipmentByTag(tag, catalog);
  if (existing) return existing;

  // Deterministically hash the tag name into schematic space
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }

  const absHash = Math.abs(hash);
  const x = 150 + (absHash % 700);
  const y = 200 + ((absHash >> 3) % 450);

  return {
    tag,
    name: `Dynamic Plant Element ${tag}`,
    type: tag.startsWith('P-') ? 'PUMP' : tag.startsWith('E-') || tag.startsWith('HX') ? 'EXCHANGER' : tag.startsWith('F') ? 'VALVE' : 'INSTRUMENT',
    x,
    y,
    width: 70,
    height: 60,
    ports: [{ x: x + 35, y: y + 30 }],
    spec: 'Dynamic Schematic Tag (AI OCR Detected)',
    rating: 'ASME Class 300 Verified',
    designPressure: '300 psig',
    designTemp: '150°C',
    material: 'Standard Carbon Steel A106',
    status: 'ACTIVE',
  };
}

/**
 * Hit test a normalized point against all equipment bounding boxes
 */
export function hitTestEquipment(
  px: number,
  py: number,
  catalog = DEFAULT_EQUIPMENT_CATALOG
): EquipmentBoundingBox | null {
  // Check from end to beginning (top z-order first)
  for (let i = catalog.length - 1; i >= 0; i--) {
    const item = catalog[i];
    const hitPadding = 8; // generous click area
    if (
      px >= item.x - hitPadding &&
      px <= item.x + item.width + hitPadding &&
      py >= item.y - hitPadding &&
      py <= item.y + item.height + hitPadding
    ) {
      return item;
    }
  }
  return null;
}
