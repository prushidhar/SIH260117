/**
 * Hardware-Accelerated Vector P&ID Diagramming Canvas Renderer
 * 
 * Renders ISA-5.1 vector industrial schematics, animated process flowlines,
 * glowing neon bounding boxes, laser scanline reticles, and minimap radar.
 */

import {
  type EquipmentBoundingBox,
  type PipeLineSegment,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_PIPING_NETWORK,
} from './pid-coordinates';

export interface CameraState {
  /** Top-left offset in canvas screen space */
  x: number;
  y: number;
  /** Zoom scale factor (1.0 = 100%) */
  zoom: number;
}

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: CameraState;
  catalog: EquipmentBoundingBox[];
  piping: PipeLineSegment[];
  activeTag: string | null;
  hoveredTag: string | null;
  detectedTags: string[];
  theme: 'light' | 'dark';
  showGrid: boolean;
  showFlowAnimation: boolean;
  showBoundingBoxes: boolean;
  showMinimap: boolean;
  flowOffset: number;
  scanlineOffset: number;
  pulsePhase: number;
  backgroundImage?: HTMLImageElement | null;
}

/**
 * Main draw dispatch routine
 */
export function renderPIDCanvas(options: RenderOptions): void {
  const { ctx, canvas, camera, theme, showGrid, showMinimap } = options;
  const width = canvas.width;
  const height = canvas.height;

  ctx.save();
  // Clear entire viewport with theme background
  ctx.fillStyle = theme === 'dark' ? '#09090b' : '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Apply Camera Transform
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);

  // 1. Engineering Coordinate Grid
  if (showGrid) {
    drawGrid(ctx, theme);
  }

  // 2. Background Schematic Image (if loaded)
  if (options.backgroundImage && options.backgroundImage.complete && options.backgroundImage.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = theme === 'dark' ? 0.35 : 0.65;
    ctx.drawImage(options.backgroundImage, 0, 0, 1000, 800);
    ctx.restore();
  }

  // 3. Process Piping Lines with Animated Fluid Flow
  drawPipingNetwork(ctx, options);

  // 4. Industrial Equipment Vector Symbols
  drawEquipmentSymbols(ctx, options);

  // 5. Equipment Bounding Boxes & Glowing HUD Highlights
  if (options.showBoundingBoxes) {
    drawBoundingBoxes(ctx, options);
  }

  // Restore camera transform
  ctx.restore();

  // 6. Viewport Minimap Radar Overlay (Screen Space)
  if (showMinimap) {
    drawMinimap(ctx, width, height, options);
  }

  ctx.restore();
}

/**
 * Draw isometric / CAD engineering millimeter grid
 */
function drawGrid(ctx: CanvasRenderingContext2D, theme: 'light' | 'dark'): void {
  const isDark = theme === 'dark';
  const majorStep = 100;
  const minorStep = 20;

  // Minor grid
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.035)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= 1000; x += minorStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
  }
  for (let y = 0; y <= 800; y += minorStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(1000, y);
  }
  ctx.stroke();

  // Major grid
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= 1000; x += majorStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
  }
  for (let y = 0; y <= 800; y += majorStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(1000, y);
  }
  ctx.stroke();

  // Boundary border
  ctx.strokeStyle = isDark ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 1000, 800);
}

/**
 * Draw process flowlines with dynamic animated flow dashes
 */
function drawPipingNetwork(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { piping, showFlowAnimation, flowOffset, theme } = options;
  const isDark = theme === 'dark';

  for (const pipe of piping) {
    const { from, to, fluidColor, lineSize } = pipe;

    // 1. Base Pipe (outer casing)
    ctx.save();
    ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // 2. Fluid Core Line
    ctx.strokeStyle = fluidColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // 3. Animated Fluid Particles (Flow Arrows / Dashes)
    if (showFlowAnimation) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = -flowOffset * 1.5 * pipe.direction;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    // Line Tag
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    ctx.font = '8px monospace';
    ctx.fillStyle = isDark ? '#71717a' : '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`${pipe.id} (${lineSize})`, midX, midY - 6);

    ctx.restore();
  }
}

/**
 * Draw ISA-5.1 industrial vector equipment symbols
 */
function drawEquipmentSymbols(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { catalog, theme } = options;
  const isDark = theme === 'dark';

  for (const eq of catalog) {
    ctx.save();
    ctx.translate(eq.x, eq.y);

    switch (eq.type) {
      case 'VESSEL':
        drawVesselSymbol(ctx, eq.width, eq.height, isDark);
        break;
      case 'PUMP':
        drawPumpSymbol(ctx, eq.width, eq.height, isDark);
        break;
      case 'EXCHANGER':
        drawExchangerSymbol(ctx, eq.width, eq.height, isDark);
        break;
      case 'VALVE':
        drawValveSymbol(ctx, eq.width, eq.height, isDark);
        break;
      case 'INSTRUMENT':
        drawInstrumentSymbol(ctx, eq.tag, eq.width, eq.height, isDark);
        break;
      case 'SAFETY_VALVE':
        drawSafetyValveSymbol(ctx, eq.width, eq.height, isDark);
        break;
    }

    ctx.restore();
  }
}

function drawVesselSymbol(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
  const fill = isDark ? '#18181b' : '#f1f5f9';
  const stroke = isDark ? '#a1a1aa' : '#475569';

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Main cylindrical body
  ctx.fillRect(0, 15, w, h - 30);
  ctx.strokeRect(0, 15, w, h - 30);

  // Top Elliptical Head
  ctx.beginPath();
  ctx.ellipse(w / 2, 15, w / 2, 15, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  // Bottom Elliptical Head
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 15, w / 2, 15, 0, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // Liquid level wave lines
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, h * 0.6);
  ctx.lineTo(w - 10, h * 0.6);
  ctx.stroke();

  // Bottom suction nozzle
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w, h - 40);
  ctx.lineTo(w + 10, h - 40);
  ctx.stroke();
}

function drawPumpSymbol(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
  const fill = isDark ? '#18181b' : '#f1f5f9';
  const stroke = isDark ? '#a1a1aa' : '#475569';
  const r = Math.min(w, h) / 2 - 4;
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Pump casing circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Internal centrifugal impeller triangle
  ctx.fillStyle = isDark ? '#6366f1' : '#818cf8';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 4);
  ctx.lineTo(cx + r - 4, cy + r - 8);
  ctx.lineTo(cx - r + 4, cy + r - 8);
  ctx.closePath();
  ctx.fill();

  // Discharge nozzle pointing top-right
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.5, cy - r * 0.7);
  ctx.lineTo(cx + r * 0.5, 0);
  ctx.stroke();
}

function drawExchangerSymbol(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
  const fill = isDark ? '#18181b' : '#f1f5f9';
  const stroke = isDark ? '#a1a1aa' : '#475569';

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Shell body (horizontal capsule)
  const headR = h / 2;
  ctx.beginPath();
  ctx.arc(headR, h / 2, headR, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineTo(w - headR, 0);
  ctx.arc(w - headR, h / 2, headR, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Internal U-Tube bundle representation
  ctx.strokeStyle = isDark ? '#06b6d4' : '#0891b2';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(headR + 5, h * 0.35);
  ctx.lineTo(w - headR - 10, h * 0.35);
  ctx.arc(w - headR - 10, h / 2, h * 0.15, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.lineTo(headR + 5, h * 0.65);
  ctx.stroke();

  // Baffle lines
  ctx.strokeStyle = isDark ? '#52525b' : '#94a3b8';
  ctx.lineWidth = 1;
  for (let bx = headR + 25; bx < w - headR; bx += 25) {
    ctx.beginPath();
    ctx.moveTo(bx, 5);
    ctx.lineTo(bx, h - 5);
    ctx.stroke();
  }
}

function drawValveSymbol(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
  const fill = isDark ? '#18181b' : '#f1f5f9';
  const stroke = isDark ? '#a1a1aa' : '#475569';
  const midX = w / 2;
  const midY = h * 0.6;
  const triW = w * 0.45;
  const triH = h * 0.35;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Opposed Flow Triangles (ISA valve body)
  ctx.beginPath();
  // Left triangle
  ctx.moveTo(midX - triW, midY - triH);
  ctx.lineTo(midX, midY);
  ctx.lineTo(midX - triW, midY + triH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right triangle
  ctx.beginPath();
  ctx.moveTo(midX + triW, midY - triH);
  ctx.lineTo(midX, midY);
  ctx.lineTo(midX + triW, midY + triH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Valve Stem & Actuator Diaphragm
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(midX, 10);
  ctx.stroke();

  // Actuator Mushroom/Dome
  ctx.fillStyle = isDark ? '#27272a' : '#e2e8f0';
  ctx.beginPath();
  ctx.arc(midX, 10, 10, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawInstrumentSymbol(ctx: CanvasRenderingContext2D, tag: string, w: number, h: number, isDark: boolean): void {
  const fill = isDark ? '#18181b' : '#ffffff';
  const stroke = isDark ? '#a1a1aa' : '#475569';
  const r = Math.min(w, h) / 2 - 2;
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;

  // ISA Bubble circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Middle division line
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  // Tag text inside bubble
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = isDark ? '#f4f4f5' : '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Upper prefix (e.g. TI, PI, FV)
  const parts = tag.split('-');
  const prefix = parts[0] || tag;
  const suffix = parts.slice(1).join('-') || '';

  ctx.fillText(prefix, cx, cy - 6);
  ctx.fillText(suffix, cx, cy + 6);
}

function drawSafetyValveSymbol(ctx: CanvasRenderingContext2D, w: number, h: number, isDark: boolean): void {
  const fill = isDark ? '#18181b' : '#f1f5f9';
  const stroke = '#ef4444'; // Red for safety
  const cx = w / 2;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;

  // Angle body
  ctx.beginPath();
  ctx.moveTo(cx, h);
  ctx.lineTo(cx, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  // Spring Bonnet
  ctx.fillRect(cx - 8, 10, 16, h * 0.4);
  ctx.strokeRect(cx - 8, 10, 16, h * 0.4);

  // Top Adjusting Screw
  ctx.beginPath();
  ctx.moveTo(cx, 10);
  ctx.lineTo(cx, 2);
  ctx.stroke();
}

/**
 * Draw Glowing Bounding Boxes, Laser Reticles & Telemetry Badges
 */
function drawBoundingBoxes(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { catalog, activeTag, hoveredTag, detectedTags, scanlineOffset, pulsePhase, theme } = options;
  const isDark = theme === 'dark';

  for (const eq of catalog) {
    const isActive = Boolean(activeTag && eq.tag.toUpperCase() === activeTag.toUpperCase());
    const isHovered = Boolean(hoveredTag && eq.tag.toUpperCase() === hoveredTag.toUpperCase());
    const isDetected = detectedTags.some((t) => t.toUpperCase() === eq.tag.toUpperCase());

    if (!isActive && !isHovered && !isDetected) {
      // Subtle quiescent tag label
      ctx.save();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isDark ? 'rgba(161, 161, 170, 0.65)' : 'rgba(71, 85, 105, 0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(eq.tag, eq.x + eq.width / 2, eq.y + eq.height + 12);
      ctx.restore();
      continue;
    }

    // Color palette based on status / activation
    let accentColor = '#8b5cf6'; // Violet default
    if (isActive) accentColor = '#10b981'; // Emerald for active focused
    if (eq.status === 'CRITICAL') accentColor = '#ef4444'; // Rose for critical ASME
    if (isHovered && !isActive) accentColor = '#06b6d4'; // Cyan for hover

    ctx.save();
    const pad = 6;
    const bx = eq.x - pad;
    const by = eq.y - pad;
    const bw = eq.width + pad * 2;
    const bh = eq.height + pad * 2;

    // 1. Concentric expanding sonar pulse rings for active target
    if (isActive) {
      const ringRadius = 10 + pulsePhase * 25;
      const ringAlpha = Math.max(0, 1 - pulsePhase);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = ringAlpha * 0.7;
      ctx.beginPath();
      ctx.arc(eq.x + eq.width / 2, eq.y + eq.height / 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Glowing outer shadow
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = isActive ? 16 : isHovered ? 10 : 6;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isActive ? 2 : 1.5;
    ctx.globalAlpha = 1.0;

    // Animated dashed outline
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -scanlineOffset * 20;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]); // clear dash

    // 3. High-tech Corner Reticle Brackets (┌ ┐ └ ┘)
    const cornerLen = 10;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    // Top-Left ┌
    ctx.moveTo(bx, by + cornerLen);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + cornerLen, by);
    // Top-Right ┐
    ctx.moveTo(bx + bw - cornerLen, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + cornerLen);
    // Bottom-Left └
    ctx.moveTo(bx, by + bh - cornerLen);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx + cornerLen, by + bh);
    // Bottom-Right ┘
    ctx.moveTo(bx + bw - cornerLen, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx + bw, by + bh - cornerLen);
    ctx.stroke();

    // 4. Sweeping Laser Scanline (Active Target Only)
    if (isActive) {
      const scanY = by + (scanlineOffset % 1) * bh;
      ctx.save();
      const grad = ctx.createLinearGradient(bx, scanY, bx + bw, scanY);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.75)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, scanY);
      ctx.lineTo(bx + bw, scanY);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Floating HUD Telemetry Badge Callout
    drawEquipmentHUDCallout(ctx, eq, bx, by, bw, bh, accentColor, isActive, isDark);

    ctx.restore();
  }
}

/**
 * Draw pinned HUD Telemetry Card attached to the bounding box
 */
function drawEquipmentHUDCallout(
  ctx: CanvasRenderingContext2D,
  eq: EquipmentBoundingBox,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  accentColor: string,
  isActive: boolean,
  isDark: boolean
): void {
  ctx.save();
  ctx.shadowBlur = 0; // Disable heavy blur for sharp typography

  const badgeW = 160;
  const badgeH = 46;
  const badgeX = bx + bw / 2 - badgeW / 2;
  const badgeY = by - badgeH - 8;

  // Connecting anchor line
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx + bw / 2, by);
  ctx.lineTo(bx + bw / 2, by - 8);
  ctx.stroke();

  // Glassmorphic background
  ctx.fillStyle = isDark ? 'rgba(9, 9, 11, 0.92)' : 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();

  // Header line: Tag + Status
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.fillText(eq.tag, badgeX + 8, badgeY + 14);

  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = isDark ? '#a1a1aa' : '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText(eq.rating, badgeX + badgeW - 8, badgeY + 14);

  // Line 2: Name / Equipment Type
  ctx.font = '8px sans-serif';
  ctx.fillStyle = isDark ? '#f4f4f5' : '#0f172a';
  ctx.textAlign = 'left';
  const truncatedName = eq.name.length > 24 ? eq.name.substring(0, 22) + '...' : eq.name;
  ctx.fillText(truncatedName, badgeX + 8, badgeY + 27);

  // Line 3: Design Pressure & Temp Telemetry
  ctx.font = '7px monospace';
  ctx.fillStyle = isDark ? '#71717a' : '#475569';
  ctx.fillText(`${eq.designPressure} • ${eq.designTemp}`, badgeX + 8, badgeY + 38);

  ctx.restore();
}

/**
 * Draw interactive Minimap Radar in the bottom-right corner
 */
function drawMinimap(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  options: RenderOptions
): void {
  const { camera, catalog, piping, activeTag, theme } = options;
  const isDark = theme === 'dark';

  const mapW = 140;
  const mapH = 112; // 1000:800 ratio
  const margin = 12;
  const mapX = viewW - mapW - margin;
  const mapY = viewH - mapH - margin;

  const scaleX = mapW / 1000;
  const scaleY = mapH / 800;

  ctx.save();

  // Radar container background
  ctx.fillStyle = isDark ? 'rgba(9, 9, 11, 0.88)' : 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = isDark ? 'rgba(63, 63, 70, 0.8)' : 'rgba(203, 213, 225, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 6);
  ctx.fill();
  ctx.stroke();

  // Minimap Title
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = isDark ? '#71717a' : '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('RADAR NAV', mapX + 6, mapY + 11);

  // Draw simplified piping
  ctx.strokeStyle = isDark ? '#3f3f46' : '#cbd5e1';
  ctx.lineWidth = 1;
  for (const pipe of piping) {
    ctx.beginPath();
    ctx.moveTo(mapX + pipe.from.x * scaleX, mapY + pipe.from.y * scaleY);
    ctx.lineTo(mapX + pipe.to.x * scaleX, mapY + pipe.to.y * scaleY);
    ctx.stroke();
  }

  // Draw simplified equipment blips
  for (const eq of catalog) {
    const isActive = activeTag && eq.tag.toUpperCase() === activeTag.toUpperCase();
    ctx.fillStyle = isActive ? '#10b981' : isDark ? '#6366f1' : '#818cf8';
    ctx.fillRect(
      mapX + eq.x * scaleX,
      mapY + eq.y * scaleY,
      Math.max(2, eq.width * scaleX),
      Math.max(2, eq.height * scaleY)
    );
  }

  // Draw Viewport Frustum Box (camera visible window)
  const visibleW = viewW / camera.zoom;
  const visibleH = viewH / camera.zoom;
  const visibleX = -camera.x / camera.zoom;
  const visibleY = -camera.y / camera.zoom;

  const fX = mapX + Math.max(0, visibleX * scaleX);
  const fY = mapY + Math.max(0, visibleY * scaleY);
  const fW = Math.min(mapW, visibleW * scaleX);
  const fH = Math.min(mapH, visibleH * scaleY);

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fX, fY, fW, fH);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.fillRect(fX, fY, fW, fH);

  ctx.restore();
}
