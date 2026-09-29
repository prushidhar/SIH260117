'use client';

import React, { memo } from 'react';
import { useViewport } from '@xyflow/react';
import { ANSI_PAPER_FORMATS, type AnsiPaperFormat } from '@/lib/canvas/equipment-catalog';
import { ShieldCheck } from 'lucide-react';

interface AnsiPaperSheetProps {
  formatId: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'NONE';
  title?: string;
  drawingNo?: string;
  project?: string;
  revision?: string;
}

export function AnsiPaperSheetComponent({
  formatId,
  title = 'PIPING & INSTRUMENTATION DIAGRAM (P&ID)',
  drawingNo = 'INDRA-01-PID-3100-D04',
  project = 'CRUDE PRE-HEAT & FRACTIONATION TRAIN',
  revision = 'D4 (IFC)',
}: AnsiPaperSheetProps) {
  const { x, y, zoom } = useViewport();

  if (formatId === 'NONE') return null;

  const format: AnsiPaperFormat = ANSI_PAPER_FORMATS[formatId] || ANSI_PAPER_FORMATS.A1;
  const { width, height, zonesX, zonesY, mmWidth, mmHeight } = format;

  const margin = 20; // 20px inner border margin
  const innerWidth = width - margin * 2;
  const innerHeight = height - margin * 2;

  // Title Block dimensions in the bottom-right corner
  const titleBlockWidth = Math.min(380, width * 0.35);
  const titleBlockHeight = 120;
  const tbX = width - margin - titleBlockWidth;
  const tbY = height - margin - titleBlockHeight;

  // Zone coordinates
  const zoneLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, zonesY);
  const zoneNumbers = ['1', '2', '3', '4', '5', '6', '7', '8'].slice(0, zonesX);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
        zIndex: 0,
        width: `${width}px`,
        height: `${height}px`,
      }}
      className="select-none"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
      >
        {/* Outer Drawing Border Background */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="rgba(10, 10, 15, 0.65)"
          stroke="#3f3f46"
          strokeWidth="3"
        />

        {/* Inner Engineering Frame Margin */}
        <rect
          x={margin}
          y={margin}
          width={innerWidth}
          height={innerHeight}
          fill="none"
          stroke="#52525b"
          strokeWidth="1.5"
        />

        {/* Corner & Centering Alignment Ticks */}
        {/* Top Center Tick */}
        <polygon
          points={`${width / 2},${margin - 8} ${width / 2 - 5},${margin} ${width / 2 + 5},${margin}`}
          fill="#10b981"
        />
        {/* Bottom Center Tick */}
        <polygon
          points={`${width / 2},${height - margin + 8} ${width / 2 - 5},${height - margin} ${width / 2 + 5},${height - margin}`}
          fill="#10b981"
        />
        {/* Left Center Tick */}
        <polygon
          points={`${margin - 8},${height / 2} ${margin},${height / 2 - 5} ${margin},${height / 2 + 5}`}
          fill="#10b981"
        />
        {/* Right Center Tick */}
        <polygon
          points={`${width - margin + 8},${height / 2} ${width - margin},${height / 2 - 5} ${width - margin},${height / 2 + 5}`}
          fill="#10b981"
        />

        {/* Zone Reference Divisions: Top & Bottom Horizontal (1 to N) */}
        {zoneNumbers.map((num, i) => {
          const segWidth = innerWidth / zonesX;
          const posX = margin + i * segWidth;
          const centerTextX = posX + segWidth / 2;
          return (
            <g key={`zone-h-${i}`}>
              {/* Ticks between zones */}
              {i > 0 && (
                <>
                  <line x1={posX} y1="0" x2={posX} y2={margin} stroke="#3f3f46" strokeWidth="1" />
                  <line x1={posX} y1={height - margin} x2={posX} y2={height} stroke="#3f3f46" strokeWidth="1" />
                </>
              )}
              {/* Top Zone Label */}
              <text
                x={centerTextX}
                y={margin - 5}
                fill="#71717a"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {num}
              </text>
              {/* Bottom Zone Label */}
              <text
                x={centerTextX}
                y={height - 6}
                fill="#71717a"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {num}
              </text>
            </g>
          );
        })}

        {/* Zone Reference Divisions: Left & Right Vertical (A to N) */}
        {zoneLetters.map((letter, i) => {
          const segHeight = innerHeight / zonesY;
          const posY = margin + i * segHeight;
          const centerTextY = posY + segHeight / 2 + 3;
          return (
            <g key={`zone-v-${i}`}>
              {/* Ticks between zones */}
              {i > 0 && (
                <>
                  <line x1="0" y1={posY} x2={margin} y2={posY} stroke="#3f3f46" strokeWidth="1" />
                  <line x1={width - margin} y1={posY} x2={width} y2={posY} stroke="#3f3f46" strokeWidth="1" />
                </>
              )}
              {/* Left Zone Label */}
              <text
                x={margin / 2}
                y={centerTextY}
                fill="#71717a"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {letter}
              </text>
              {/* Right Zone Label */}
              <text
                x={width - margin / 2}
                y={centerTextY}
                fill="#71717a"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {letter}
              </text>
            </g>
          );
        })}

        {/* Engineering Title Block (ASME Y14.1 Standard) */}
        <g id="title-block">
          {/* Main Title Block Box */}
          <rect
            x={tbX}
            y={tbY}
            width={titleBlockWidth}
            height={titleBlockHeight}
            fill="#121215"
            stroke="#10b981"
            strokeWidth="2"
          />

          {/* Row 1: Company & Sovereign Security Level */}
          <line x1={tbX} y1={tbY + 28} x2={tbX + titleBlockWidth} y2={tbY + 28} stroke="#27272a" strokeWidth="1" />
          <text x={tbX + 10} y={tbY + 18} fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">
            INDRA SOVEREIGN PROCESS SYSTEMS
          </text>
          <text x={tbX + titleBlockWidth - 10} y={tbY + 18} fill="#71717a" fontSize="9" fontFamily="monospace" textAnchor="end">
            AIR-GAP RESTRICTED
          </text>

          {/* Row 2: Project Name */}
          <line x1={tbX} y1={tbY + 54} x2={tbX + titleBlockWidth} y2={tbY + 54} stroke="#27272a" strokeWidth="1" />
          <text x={tbX + 10} y={tbY + 40} fill="#71717a" fontSize="8" fontFamily="monospace">
            PROJECT:
          </text>
          <text x={tbX + 10} y={tbY + 50} fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">
            {project}
          </text>

          {/* Row 3: Sheet Title */}
          <line x1={tbX} y1={tbY + 84} x2={tbX + titleBlockWidth} y2={tbY + 84} stroke="#27272a" strokeWidth="1" />
          <text x={tbX + 10} y={tbY + 68} fill="#71717a" fontSize="8" fontFamily="monospace">
            TITLE:
          </text>
          <text x={tbX + 10} y={tbY + 79} fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">
            {title}
          </text>

          {/* Row 4 Columns: Doc Number, Rev, Format, Approval */}
          <line x1={tbX + titleBlockWidth * 0.45} y1={tbY + 84} x2={tbX + titleBlockWidth * 0.45} y2={tbY + titleBlockHeight} stroke="#27272a" strokeWidth="1" />
          <line x1={tbX + titleBlockWidth * 0.7} y1={tbY + 84} x2={tbX + titleBlockWidth * 0.7} y2={tbY + titleBlockHeight} stroke="#27272a" strokeWidth="1" />

          {/* Col 1: Drawing No */}
          <text x={tbX + 10} y={tbY + 96} fill="#71717a" fontSize="8" fontFamily="monospace">
            DWG NO:
          </text>
          <text x={tbX + 10} y={tbY + 110} fill="#e4e4e7" fontSize="10" fontFamily="monospace" fontWeight="bold">
            {drawingNo}
          </text>

          {/* Col 2: Rev & Sheet */}
          <text x={tbX + titleBlockWidth * 0.45 + 8} y={tbY + 96} fill="#71717a" fontSize="8" fontFamily="monospace">
            REV / SHT:
          </text>
          <text x={tbX + titleBlockWidth * 0.45 + 8} y={tbY + 110} fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">
            {revision} (1 OF 1)
          </text>

          {/* Col 3: Size & Status */}
          <text x={tbX + titleBlockWidth * 0.7 + 8} y={tbY + 96} fill="#71717a" fontSize="8" fontFamily="monospace">
            SIZE: {format.id} (1:1)
          </text>
          <text x={tbX + titleBlockWidth * 0.7 + 8} y={tbY + 110} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
            APPROVED
          </text>
        </g>

        {/* Top-Left Sheet Format Badge */}
        <g id="sheet-spec-tag">
          <rect
            x={margin + 8}
            y={margin + 8}
            width={180}
            height={26}
            rx={4}
            fill="#18181b"
            stroke="#27272a"
            strokeWidth="1"
          />
          <text x={margin + 16} y={margin + 25} fill="#a1a1aa" fontSize="10" fontFamily="monospace" fontWeight="bold">
            SHEET {format.id}: {mmWidth} × {mmHeight} mm
          </text>
        </g>
      </svg>
    </div>
  );
}

export default memo(AnsiPaperSheetComponent);
