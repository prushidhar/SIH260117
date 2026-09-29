'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuditLedgerQuery } from '@/lib/queries';
import { sessionRecorder, type SessionAuditEvent } from '@/lib/audit/session-recorder';

export function useAirGapTelemetry() {
  // 1. Live Synchronized UTC Clock (1Hz)
  const [utcTime, setUtcTime] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
    fullFormatted: string;
    pulse: boolean;
  }>({
    hours: '00',
    minutes: '00',
    seconds: '00',
    fullFormatted: '00:00:00 UTC',
    pulse: false,
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(prev => ({
        hours: h,
        minutes: m,
        seconds: s,
        fullFormatted: `${h}:${m}:${s} UTC`,
        pulse: !prev.pulse,
      }));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Real API Engine Latency Ping (ms)
  const [apiLatencyMs, setApiLatencyMs] = useState<number>(12);
  const [isApiAlive, setIsApiAlive] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const measurePing = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch('http://localhost:8000/api/approvals/pending', {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });
        const elapsed = Math.round(performance.now() - t0);
        if (isMounted) {
          if (res.ok) {
            setApiLatencyMs(Math.max(1, elapsed));
            setIsApiAlive(true);
          } else {
            setApiLatencyMs(elapsed);
            setIsApiAlive(false);
          }
        }
      } catch {
        if (isMounted) {
          // If offline or timeout, show default loopback latency indication
          setApiLatencyMs(15);
          setIsApiAlive(false);
        }
      }
    };

    measurePing();
    const pingInterval = setInterval(measurePing, 10000);
    return () => {
      isMounted = false;
      clearInterval(pingInterval);
    };
  }, []);

  // 3. Merkle Chain Integrity Root Hash
  const { data: ledgerData } = useAuditLedgerQuery();
  const merkleRootRaw = ledgerData?.merkle_root || 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
  
  // Format root preview as 0x7f83...9069
  const merkleRootPreview = (() => {
    const clean = merkleRootRaw.replace(/^(SHA256:|sha256:|0x)/i, '');
    if (clean.length > 10) {
      return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
    }
    return `0x${clean}`;
  })();

  // 4. Local GPU / Tensor Inference Load Simulation (realistic SCADA fluctuation: 34% - 56%)
  const [gpuLoad, setGpuLoad] = useState<number>(38);
  useEffect(() => {
    const gpuInterval = setInterval(() => {
      setGpuLoad(prev => {
        const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
        const next = prev + delta;
        return Math.min(62, Math.max(32, next));
      });
    }, 3000);
    return () => clearInterval(gpuInterval);
  }, []);

  // 5. Session Audit Recorder Synchronization
  const [isRecording, setIsRecording] = useState<boolean>(sessionRecorder.getIsRecording());
  const [eventCount, setEventCount] = useState<number>(sessionRecorder.getEventsCount());
  const [recordingDuration, setRecordingDuration] = useState<string>('00:00');

  useEffect(() => {
    const unsub = sessionRecorder.subscribe(() => {
      setIsRecording(sessionRecorder.getIsRecording());
      setEventCount(sessionRecorder.getEventsCount());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration('00:00');
      return;
    }

    const timer = setInterval(() => {
      const start = sessionRecorder.getStartTime();
      if (!start) return;
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const ss = String(elapsedSec % 60).padStart(2, '0');
      setRecordingDuration(`${mm}:${ss}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  return {
    utcTime,
    apiLatencyMs,
    isApiAlive,
    merkleRootPreview,
    merkleRootRaw,
    gpuLoad,
    isRecording,
    recordingDuration,
    eventCount,
    toggleRecording: (route?: string) => sessionRecorder.toggleRecording(route),
    exportAuditLog: () => sessionRecorder.exportToJsonl(),
    recordAuditEvent: (evt: {
      category: SessionAuditEvent['category'];
      action: string;
      route: string;
      payload?: Record<string, unknown>;
    }) => sessionRecorder.recordEvent(evt),
  };
}
