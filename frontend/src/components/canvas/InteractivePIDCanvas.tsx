/**
 * InteractivePIDCanvas — Hardware-accelerated Interactive Vector P&ID Viewport
 * 
 * Features:
 * - Fluid pan & zoom with mouse drag, wheel, and pinch gestures
 * - Cinematic auto-focus camera animation targeting equipment coordinates
 * - Animated glowing bounding boxes, scanlines, and reticles
 * - Live coordinate HUD and interactive hit testing
 * - Minimap radar navigator
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Activity,
  Layers,
  MapPin,
  Crosshair,
  Compass
} from 'lucide-react';
import {
  type EquipmentBoundingBox,
  DEFAULT_EQUIPMENT_CATALOG,
  DEFAULT_PIPING_NETWORK,
  findEquipmentByTag,
  hitTestEquipment,
  getOrCreateEquipmentBox,
} from '@/lib/canvas/pid-coordinates';
import { renderPIDCanvas, type CameraState } from '@/lib/canvas/pid-renderer';

interface InteractivePIDCanvasProps {
  /** Optional background image URL (e.g. from activePIDDoc) */
  imageUrl?: string | null;
  /** Currently active / focused equipment tag */
  activeTag?: string | null;
  /** List of detected tags from agent / OCR */
  detectedTags?: string[];
  /** Callback when user clicks an equipment unit on the canvas */
  onSelectTag?: (tag: string) => void;
  /** Current UI theme */
  theme?: 'light' | 'dark';
  /** Additional container styling */
  className?: string;
  /** Fullscreen / expanded mode */
  isExpanded?: boolean;
}

export default function InteractivePIDCanvas({
  imageUrl,
  activeTag = null,
  detectedTags = [],
  onSelectTag,
  theme = 'dark',
  className = '',
  isExpanded = false,
}: InteractivePIDCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera State
  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 0.8 });
  const targetCameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 0.8 });
  const isAnimatingCameraRef = useRef(false);

  // Interaction State
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAtDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(80);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Viewport Toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);

  // Animation Loop Values
  const flowOffsetRef = useRef(0);
  const scanlineOffsetRef = useRef(0);
  const pulsePhaseRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Merge detected tags into catalog if not already present
  const [catalog, setCatalog] = useState<EquipmentBoundingBox[]>(DEFAULT_EQUIPMENT_CATALOG);

  useEffect(() => {
    if (detectedTags && detectedTags.length > 0) {
      setCatalog((prev) => {
        let updated = [...prev];
        for (const tag of detectedTags) {
          if (!updated.some((e) => e.tag.toUpperCase() === tag.toUpperCase())) {
            updated.push(getOrCreateEquipmentBox(tag, updated));
          }
        }
        return updated;
      });
    }
  }, [detectedTags]);

  // Load background image if provided
  useEffect(() => {
    if (!imageUrl) {
      bgImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      bgImageRef.current = img;
    };
    img.onerror = () => {
      bgImageRef.current = null;
    };
  }, [imageUrl]);

  /**
   * Smoothly fly camera to specific coordinates with spring interpolation
   */
  const flyTo = useCallback((targetX: number, targetY: number, targetZoom: number) => {
    targetCameraRef.current = { x: targetX, y: targetY, zoom: targetZoom };
    isAnimatingCameraRef.current = true;
  }, []);

  /**
   * Center on specific equipment tag
   */
  const focusOnTag = useCallback((tag: string) => {
    const eq = findEquipmentByTag(tag, catalog) || getOrCreateEquipmentBox(tag, catalog);
    if (!eq || !containerRef.current) return;

    const viewW = containerRef.current.clientWidth;
    const viewH = containerRef.current.clientHeight;

    const zoom = isExpanded ? 1.8 : 1.4;
    // Center point of equipment
    const eqCenterX = eq.x + eq.width / 2;
    const eqCenterY = eq.y + eq.height / 2;

    const targetX = viewW / 2 - eqCenterX * zoom;
    const targetY = viewH / 2 - eqCenterY * zoom;

    flyTo(targetX, targetY, zoom);
  }, [catalog, isExpanded, flyTo]);

  /**
   * Reset camera to fit entire diagram
   */
  const resetCamera = useCallback(() => {
    if (!containerRef.current) return;
    const viewW = containerRef.current.clientWidth;
    const viewH = containerRef.current.clientHeight;

    const scaleX = viewW / 1000;
    const scaleY = viewH / 800;
    const fitZoom = Math.min(scaleX, scaleY) * 0.95;

    const fitX = (viewW - 1000 * fitZoom) / 2;
    const fitY = (viewH - 800 * fitZoom) / 2;

    flyTo(fitX, fitY, fitZoom);
  }, [flyTo]);

  // Auto-focus camera whenever activeTag changes
  useEffect(() => {
    if (activeTag) {
      focusOnTag(activeTag);
    }
  }, [activeTag, focusOnTag]);

  // Initial fit on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      resetCamera();
    }, 50);
    return () => clearTimeout(timer);
  }, [resetCamera]);

  /**
   * Convert client viewport coordinates to normalized schematic coordinates
   */
  const clientToSchematic = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const cam = cameraRef.current;
    const schX = (screenX - cam.x) / cam.zoom;
    const schY = (screenY - cam.y) / cam.zoom;
    return { x: schX, y: schY };
  }, []);

  /**
   * Canvas Pointer Handlers
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // only left click
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    cameraAtDragStartRef.current = { ...cameraRef.current };
    isAnimatingCameraRef.current = false; // cancel automated fly-to on manual drag
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const sch = clientToSchematic(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(sch.x), y: Math.round(sch.y) });

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      cameraRef.current.x = cameraAtDragStartRef.current.x + dx;
      cameraRef.current.y = cameraAtDragStartRef.current.y + dy;
      targetCameraRef.current.x = cameraRef.current.x;
      targetCameraRef.current.y = cameraRef.current.y;
    } else {
      // Hover hit-testing
      const hit = hitTestEquipment(sch.x, sch.y, catalog);
      setHoveredTag(hit ? hit.tag : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    isDraggingRef.current = false;

    // If drag was minimal, treat as click
    if (dx < 5 && dy < 5) {
      const sch = clientToSchematic(e.clientX, e.clientY);
      const hit = hitTestEquipment(sch.x, sch.y, catalog);
      if (hit) {
        onSelectTag?.(hit.tag);
        focusOnTag(hit.tag);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(5.0, cameraRef.current.zoom * zoomFactor));

    // Zoom centered around mouse pointer
    const newX = mouseX - (mouseX - cameraRef.current.x) * (newZoom / cameraRef.current.zoom);
    const newY = mouseY - (mouseY - cameraRef.current.y) * (newZoom / cameraRef.current.zoom);

    cameraRef.current = { x: newX, y: newY, zoom: newZoom };
    targetCameraRef.current = { ...cameraRef.current };
    isAnimatingCameraRef.current = false;
    setCurrentZoom(Math.round(newZoom * 100));
  };

  const handleZoomButton = (delta: number) => {
    if (!containerRef.current) return;
    const viewW = containerRef.current.clientWidth;
    const viewH = containerRef.current.clientHeight;

    const newZoom = Math.max(0.2, Math.min(5.0, cameraRef.current.zoom * (delta > 0 ? 1.25 : 0.8)));
    const centerX = viewW / 2;
    const centerY = viewH / 2;

    const newX = centerX - (centerX - cameraRef.current.x) * (newZoom / cameraRef.current.zoom);
    const newY = centerY - (centerY - cameraRef.current.y) * (newZoom / cameraRef.current.zoom);

    flyTo(newX, newY, newZoom);
  };

  /**
   * Main 60 FPS Animation & Render Loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // 1. Smooth Camera Spring Interpolation
      if (isAnimatingCameraRef.current) {
        const speed = 7.0; // spring speed
        const t = Math.min(1.0, dt * speed);
        cameraRef.current.x += (targetCameraRef.current.x - cameraRef.current.x) * t;
        cameraRef.current.y += (targetCameraRef.current.y - cameraRef.current.y) * t;
        cameraRef.current.zoom += (targetCameraRef.current.zoom - cameraRef.current.zoom) * t;

        const dist = Math.hypot(
          targetCameraRef.current.x - cameraRef.current.x,
          targetCameraRef.current.y - cameraRef.current.y
        );
        if (dist < 0.5 && Math.abs(targetCameraRef.current.zoom - cameraRef.current.zoom) < 0.005) {
          cameraRef.current = { ...targetCameraRef.current };
          isAnimatingCameraRef.current = false;
        }
        setCurrentZoom(Math.round(cameraRef.current.zoom * 100));
      }

      // 2. Animated Flow and Radar Phases
      if (showFlow) {
        flowOffsetRef.current = (flowOffsetRef.current + dt * 25) % 1000;
      }
      scanlineOffsetRef.current = (scanlineOffsetRef.current + dt * 0.8) % 1.0;
      pulsePhaseRef.current = (pulsePhaseRef.current + dt * 1.2) % 1.0;

      // 3. Render Canvas
      renderPIDCanvas({
        canvas,
        ctx,
        camera: cameraRef.current,
        catalog,
        piping: DEFAULT_PIPING_NETWORK,
        activeTag,
        hoveredTag,
        detectedTags,
        theme,
        showGrid,
        showFlowAnimation: showFlow,
        showBoundingBoxes: showBoxes,
        showMinimap,
        flowOffset: flowOffsetRef.current,
        scanlineOffset: scanlineOffsetRef.current,
        pulsePhase: pulsePhaseRef.current,
        backgroundImage: bgImageRef.current,
      });

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [catalog, activeTag, hoveredTag, detectedTags, theme, showGrid, showFlow, showBoxes, showMinimap]);

  // Resize canvas according to container dimensions
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current.getBoundingClientRect();

      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${rect.height}px`;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden rounded-xl select-none group ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Interactive Canvas Element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${isDraggingRef.current ? 'cursor-grabbing' : hoveredTag ? 'cursor-pointer' : 'cursor-grab'}`}
      />

      {/* Top-Right HUD Navigation Toolbar */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-md">
        <button
          onClick={() => handleZoomButton(1)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoomButton(-1)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetCamera}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Fit to Screen"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

        <button
          onClick={() => setShowFlow(!showFlow)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showFlow
              ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-bold'
              : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title="Toggle Animated Process Flow"
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowBoxes(!showBoxes)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showBoxes
              ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-bold'
              : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title="Toggle Equipment Bounding Boxes"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showMinimap
              ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-bold'
              : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
          title="Toggle Radar Minimap"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left Live Coordinate & Zoom HUD Telemetry */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 text-[10px] font-mono text-slate-500 dark:text-zinc-400 shadow-sm pointer-events-none">
        <span className="font-bold text-slate-800 dark:text-zinc-200">{currentZoom}%</span>
        <span className="text-slate-300 dark:text-zinc-700">•</span>
        {cursorPos ? (
          <span>
            X: <strong className="text-slate-700 dark:text-zinc-300">{cursorPos.x}</strong> Y: <strong className="text-slate-700 dark:text-zinc-300">{cursorPos.y}</strong>
          </span>
        ) : (
          <span>SCHEMATIC 1000×800</span>
        )}
        {activeTag && (
          <>
            <span className="text-slate-300 dark:text-zinc-700">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LOCK: {activeTag}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
