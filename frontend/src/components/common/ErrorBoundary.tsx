'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('INDRA ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('indra-chat-session-storage');
      } catch {}
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack;

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-black p-4 font-sans text-slate-800 dark:text-zinc-100">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
                  Sovereign Workbench Error Intercepted
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                  Air-gap containment boundary protected runtime memory.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs font-mono text-rose-800 dark:text-rose-300 break-words leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-900 dark:text-rose-200 uppercase tracking-wider text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Exception Details:</span>
              </div>
              {errorMessage}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={this.handleReset}
                className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Clear cached state and reboot"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Cache</span>
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Workbench</span>
              </button>
            </div>

            {/* Collapsible Stack Trace */}
            {stack && (
              <div className="pt-2">
                <button
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-mono flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{this.state.showDetails ? 'Hide Diagnostic Stack' : 'Show Diagnostic Stack'}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                    {stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
