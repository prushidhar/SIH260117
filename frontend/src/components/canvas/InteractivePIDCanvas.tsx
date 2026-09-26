/**
 * InteractivePIDCanvas — Hardware-accelerated Interactive Vector P&ID Viewport
 * 
 * Features:
 * - Fluid pan & zoom with mouse drag, wheel, and pinch gestures
 * - Cinematic auto-focus camera animation targeting equipment coordinates
 * - Animated glowing bounding boxes, scanlines, and reticles
 * - Live coordinate HUD and interactive hit testing
 * - Minimap radar navigator
 * - Interactive Industrial Process Fault Injection & Transient Simulator (Cavitation, PSV Relief, Valve Jam, Dynamic Unbalance)
 * - Click-to-Probe Telemetry HUD with Direct AI Workbench Dispatch
 * - Zero-WAN Audio Annunciator Integration (Chimes, Klaxons, Speech Alerts)
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
  Compass,
  AlertTriangle,
  Flame,
  Gauge,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu
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
import useIndraStore from '@/store/indra-store';
import {
  playAlarmChime,
  playTripKlaxon,
  playSuccessChirp,
  speakSovereignAlert,
  isSoundEnabled,
  toggleSound,
} from '@/lib/sound/sovereign-audio';

export type FaultMode = 'NOMINAL' | 'CAVITATION' | 'PSV_RELIEF' | 'VALVE_JAM' | 'DYNAMIC_UNBALANCE';

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
  const { setInputValue, setActiveNav, addToast } = useIndraStore();

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
  const [inspectedBox, setInspectedBox] = useState<EquipmentBoundingBox | null>(null);

  // Fault Simulator State
  const [faultMode, setFaultMode] = useState<FaultMode>('NOMINAL');
  const [soundOn, setSoundOn] = useState(true);

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

  // Catalog State
  const [catalog, setCatalog] = useState<EquipmentBoundingBox[]>(DEFAULT_EQUIPMENT_CATALOG);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  // Merge detected tags into catalog if not already present
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
      const found = findEquipmentByTag(activeTag, catalog);
      if (found) setInspectedBox(found);
    }
  }, [activeTag, focusOnTag, catalog]);

  // Initial fit on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      resetCamera();
    }, 50);
    return () => clearTimeout(timer);
  }, [resetCamera]);

  /**
   * Fault Injection Controller
   */
  const applyFaultMode = (mode: FaultMode) => {
    setFaultMode(mode);

    if (mode === 'CAVITATION') {
      playAlarmChime();
      speakSovereignAlert('Warning: Slurry pump P-101 suction pressure drop. Cavitation risk detected.');
      setCatalog((prev) =>
        prev.map((eq) =>
          eq.tag === 'P-101'
            ? { ...eq, status: 'CRITICAL', rating: 'CAVITATION INCEPTION (NPSHa 3.05m < 3.20m)' }
            : eq
        )
      );
      focusOnTag('P-101');
      const p101 = findEquipmentByTag('P-101', catalog);
      if (p101) setInspectedBox(p101);
      addToast({
        type: 'error',
        title: 'Fault Injected: API 610 Cavitation Inception',
        message: 'P-101 suction head dropped below vapor pressure margin.',
      });
    } else if (mode === 'PSV_RELIEF') {
      playTripKlaxon();
      speakSovereignAlert('Alert: Column overpressure. Safety valve 101 lifted.');
      setCatalog((prev) =>
        prev.map((eq) =>
          eq.tag === 'PSV-101'
            ? { ...eq, status: 'WARNING', rating: 'ACTIVE RELIEF (84.5 psig > 80 psig)' }
            : eq
        )
      );
      focusOnTag('PSV-101');
      const psv = findEquipmentByTag('PSV-101', catalog);
      if (psv) setInspectedBox(psv);
      addToast({
        type: 'warning',
        title: 'Fault Injected: Column Overpressure',
        message: 'PSV-101 setpoint exceeded. Vapor relief stream active.',
      });
    } else if (mode === 'VALVE_JAM') {
      playAlarmChime();
      speakSovereignAlert('Warning: Control valve FV-101 stem jammed.');
      setCatalog((prev) =>
        prev.map((eq) =>
          eq.tag === 'FV-101'
            ? { ...eq, status: 'WARNING', rating: 'VALVE JAMMED (15% FLOW TRIM)' }
            : eq
        )
      );
      focusOnTag('FV-101');
      const fv = findEquipmentByTag('FV-101', catalog);
      if (fv) setInspectedBox(fv);
      addToast({
        type: 'warning',
        title: 'Fault Injected: Control Valve Jam',
        message: 'FV-101 stuck at 15% open. Upstream header pressure rising.',
      });
    } else if (mode === 'DYNAMIC_UNBALANCE') {
      playAlarmChime();
      speakSovereignAlert('Warning: High vibration harmonic on pump P-101. Dynamic rotor unbalance.');
      setCatalog((prev) =>
        prev.map((eq) =>
          eq.tag === 'P-101'
            ? { ...eq, status: 'WARNING', rating: 'VIBRATION ZONE C (6.2 mm/s RMS, 1X Unbalance)' }
            : eq
        )
      );
      focusOnTag('P-101');
      const p101 = findEquipmentByTag('P-101', catalog);
      if (p101) setInspectedBox(p101);
      addToast({
        type: 'warning',
        title: 'Fault Injected: ISO 10816 Dynamic Unbalance',
        message: 'Drive-end bearing velocity exceeded Zone B threshold.',
      });
    } else {
      playSuccessChirp();
      speakSovereignAlert('Plant process topology returned to nominal steady state.');
      setCatalog(DEFAULT_EQUIPMENT_CATALOG);
      addToast({
        type: 'success',
        title: 'Process Normalized',
        message: 'Steady-state crude feed flow restored (450 GPM nominal).',
      });
    }
  };

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
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    cameraAtDragStartRef.current = { ...cameraRef.current };
    isAnimatingCameraRef.current = false;
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
      const hit = hitTestEquipment(sch.x, sch.y, catalog);
      setHoveredTag(hit ? hit.tag : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    isDraggingRef.current = false;

    // Minimal drag => treat as click
    if (dx < 6 && dy < 6) {
      const sch = clientToSchematic(e.clientX, e.clientY);
      const hit = hitTestEquipment(sch.x, sch.y, catalog);
      if (hit) {
        onSelectTag?.(hit.tag);
        setInspectedBox(hit);
        focusOnTag(hit.tag);
      } else {
        setInspectedBox(null);
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
        const speed = 7.0;
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

      // 2. Animated Flow Speed (Faster in Cavitation / Surge)
      if (showFlow) {
        const flowSpeed = faultMode === 'VALVE_JAM' ? 8 : faultMode === 'CAVITATION' ? 45 : 25;
        flowOffsetRef.current = (flowOffsetRef.current + dt * flowSpeed) % 1000;
      }
      scanlineOffsetRef.current = (scanlineOffsetRef.current + dt * 0.8) % 1.0;
      pulsePhaseRef.current = (pulsePhaseRef.current + dt * (faultMode !== 'NOMINAL' ? 2.5 : 1.2)) % 1.0;

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
  }, [catalog, activeTag, hoveredTag, detectedTags, theme, showGrid, showFlow, showBoxes, showMinimap, faultMode]);

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

  const handleDispatchAI = (box: EquipmentBoundingBox) => {
    setInputValue(`Perform comprehensive statutory asset integrity and compliance evaluation on ${box.tag} (${box.name}) under ${faultMode === 'NOMINAL' ? 'normal' : faultMode} process conditions.`);
    setActiveNav('workbench');
  };

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

      {/* Top Center: Process Fault Injection & Transient Simulator Deck */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-lg text-[10px] font-mono z-10">
        <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1 mr-1">
          <Activity className="w-3.5 h-3.5 text-violet-500" />
          <span>SIMULATOR:</span>
        </span>

        <button
          onClick={() => applyFaultMode('NOMINAL')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
            faultMode === 'NOMINAL'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
          }`}
          title="Restore nominal steady-state operation"
        >
          NOMINAL
        </button>

        <button
          onClick={() => applyFaultMode('CAVITATION')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
            faultMode === 'CAVITATION'
              ? 'bg-rose-600 text-white animate-pulse shadow-xs'
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
          }`}
          title="Inject P-101 suction cavitation surge"
        >
          CAVITATION
        </button>

        <button
          onClick={() => applyFaultMode('PSV_RELIEF')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
            faultMode === 'PSV_RELIEF'
              ? 'bg-amber-600 text-white animate-pulse shadow-xs'
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
          }`}
          title="Inject column overpressure relief"
        >
          PSV RELIEF
        </button>

        <button
          onClick={() => applyFaultMode('VALVE_JAM')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
            faultMode === 'VALVE_JAM'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
          }`}
          title="Jam control valve FV-101 stem at 15%"
        >
          VALVE JAM
        </button>

        <button
          onClick={() => applyFaultMode('DYNAMIC_UNBALANCE')}
          className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
            faultMode === 'DYNAMIC_UNBALANCE'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
          }`}
          title="Inject 2X rotor unbalance harmonics on P-101"
        >
          UNBALANCE
        </button>
      </div>

      {/* Top-Right HUD Navigation Toolbar */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-md z-10">
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

        <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

        {/* Audio Toggle */}
        <button
          onClick={() => {
            const next = toggleSound();
            setSoundOn(next);
            if (next) playSuccessChirp();
          }}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            soundOn
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-zinc-600'
          }`}
          title={soundOn ? 'Sovereign Audio: ON' : 'Sovereign Audio: MUTED'}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Floating Equipment Click Telemetry Inspector HUD Flyout */}
      {inspectedBox && (
        <div className="absolute top-12 left-2.5 w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl text-xs font-mono z-20 space-y-2.5 animate-in slide-in-from-left-4 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-850">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                inspectedBox.status === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : inspectedBox.status === 'WARNING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`} />
              <strong className="text-sm text-slate-900 dark:text-zinc-100 font-bold">{inspectedBox.tag}</strong>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-900 text-slate-500">
                {inspectedBox.type}
              </span>
            </div>
            <button
              onClick={() => setInspectedBox(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-zinc-300 font-sans leading-tight">
            {inspectedBox.name}
          </div>

          {/* Real-time telemetry indicators */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50 dark:bg-zinc-900/60 p-2 rounded-xl border border-slate-100 dark:border-zinc-850">
            <div>
              <span className="text-slate-400 block text-[9px]">FLOW:</span>
              <strong className="text-slate-800 dark:text-zinc-200">
                {faultMode === 'VALVE_JAM' ? '80.0 GPM' : '450.0 GPM'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">PRESSURE:</span>
              <strong className="text-slate-800 dark:text-zinc-200">
                {faultMode === 'PSV_RELIEF' ? '84.5 psig (RELIEF)' : faultMode === 'CAVITATION' ? '14.2 psig (LOW)' : '78.4 psig'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">VIBRATION:</span>
              <strong className={faultMode === 'DYNAMIC_UNBALANCE' ? 'text-amber-500' : 'text-slate-800 dark:text-zinc-200'}>
                {faultMode === 'DYNAMIC_UNBALANCE' ? '6.2 mm/s (ZONE C)' : '2.4 mm/s (ZONE B)'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px]">RATING:</span>
              <strong className="text-slate-800 dark:text-zinc-200">{inspectedBox.rating.split(' ')[0]}</strong>
            </div>
          </div>

          <div className="text-[9.5px] text-slate-500 dark:text-zinc-400 space-y-0.5">
            <div><strong>Spec:</strong> {inspectedBox.spec}</div>
            <div><strong>Material:</strong> {inspectedBox.material}</div>
            <div><strong>Design:</strong> {inspectedBox.designPressure} • {inspectedBox.designTemp}</div>
          </div>

          {/* Action buttons */}
          <div className="pt-1 flex items-center gap-1.5">
            <button
              onClick={() => handleDispatchAI(inspectedBox)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
              title="Send to AI workbench for engineering evaluation"
            >
              <Sparkles className="w-3 h-3 text-violet-200" />
              <span>Analyze with AI</span>
            </button>
            <button
              onClick={() => focusOnTag(inspectedBox.tag)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Center camera on asset"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom-Left Live Coordinate & Zoom HUD Telemetry */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800/80 text-[10px] font-mono text-slate-500 dark:text-zinc-400 shadow-sm pointer-events-none z-10">
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
        <span className="text-slate-300 dark:text-zinc-700">•</span>
        <span className="font-bold text-violet-600 dark:text-violet-400">
          MODE: {faultMode}
        </span>
      </div>
    </div>
  );
}
