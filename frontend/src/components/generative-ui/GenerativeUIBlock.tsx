'use client';

import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { Cpu, ChevronDown, ChevronUp, Code2, AlertTriangle, Sparkles } from 'lucide-react';
import type { GenerativeUISpec } from './types';
import GenerativeUIRegistry from './GenerativeUIRegistry';

interface Props {
  spec: GenerativeUISpec;
}

interface ErrorBoundaryProps {
  fallbackName: string;
  rawJson?: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MicroFrontendErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[GenerativeUI] Render failure in ${this.props.fallbackName}:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Generative UI Fallback: {this.props.fallbackName}</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-sans">
            Could not render dynamic component with provided props.
          </p>
          {this.props.rawJson && (
            <pre className="p-2 rounded bg-white/80 dark:bg-black/40 text-[10px] overflow-x-auto max-h-32">
              {this.props.rawJson}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function GenerativeUIBlock({ spec }: Props) {
  const [showRawSpec, setShowRawSpec] = useState<boolean>(false);

  return (
    <div className="my-3.5 space-y-1.5 not-prose">
      {/* Micro-Frontend Titlebar */}
      <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-500 dark:text-zinc-400 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Generative UI Micro-Frontend</span>
          </span>
          <span className="text-slate-300 dark:text-zinc-700">•</span>
          <span className="font-semibold text-slate-700 dark:text-zinc-300">{spec.component}</span>
        </div>

        <button
          onClick={() => setShowRawSpec(!showRawSpec)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          title="Inspect JSON Schema & Parameters"
        >
          <Code2 className="w-3 h-3" />
          <span>{showRawSpec ? 'Hide Spec' : 'Inspect Spec'}</span>
          {showRawSpec ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Raw Spec Inspection Drawer */}
      {showRawSpec && (
        <div className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono border border-slate-800 shadow-xs max-h-48 overflow-y-auto">
          <div className="text-[10px] text-slate-400 pb-1 mb-1 border-b border-slate-800 flex justify-between">
            <span>JSON Component Payload</span>
            <span>Status: {spec.status || 'ready'}</span>
          </div>
          <pre>
            <code>{spec.rawJson || JSON.stringify(spec, null, 2)}</code>
          </pre>
        </div>
      )}

      {/* Render the Active Component through Error Boundary */}
      <MicroFrontendErrorBoundary fallbackName={spec.component} rawJson={spec.rawJson}>
        <GenerativeUIRegistry component={spec.component} props={spec.props} />
      </MicroFrontendErrorBoundary>
    </div>
  );
}
