'use client';

import React, { useState, useId } from 'react';
import { Code, Eye, Sparkles, Check, Copy } from 'lucide-react';
import type { DynamicSandboxWidgetProps } from '../types';

export default function DynamicSandboxWidget({
  title = 'AI-Synthesized Bespoke Industrial Interface',
  subtitle = 'Compiled dynamically in air-gapped sandbox',
  code = '',
  html = '',
}: DynamicSandboxWidgetProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'code'>('view');
  const [copied, setCopied] = useState<boolean>(false);
  const widgetId = useId();

  // If raw code was provided but no html wrapper, build a safe sandboxed HTML document
  // NOTE: No external CDN — fully offline/air-gapped compatible
  const renderedContent = html || `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          /* Offline-safe utility classes (replaces Tailwind CDN) */
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: transparent;
            color: #1e293b;
            font-size: 14px;
            line-height: 1.6;
          }
          @media (prefers-color-scheme: dark) { body { color: #f1f5f9; } }
          .p-4 { padding: 1rem; }
          .p-2 { padding: 0.5rem; }
          .p-3 { padding: 0.75rem; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
          .m-0 { margin: 0; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mt-2 { margin-top: 0.5rem; }
          .mt-4 { margin-top: 1rem; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .text-lg { font-size: 1.125rem; }
          .text-xl { font-size: 1.25rem; }
          .text-2xl { font-size: 1.5rem; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .font-mono { font-family: monospace; }
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .flex-row { flex-direction: row; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .gap-2 { gap: 0.5rem; }
          .gap-4 { gap: 1rem; }
          .w-full { width: 100%; }
          .h-full { height: 100%; }
          .max-w-xl { max-width: 36rem; }
          .rounded { border-radius: 0.25rem; }
          .rounded-lg { border-radius: 0.5rem; }
          .rounded-xl { border-radius: 0.75rem; }
          .border { border: 1px solid #e2e8f0; }
          .border-2 { border: 2px solid #e2e8f0; }
          .bg-white { background: #ffffff; }
          .bg-gray-50 { background: #f8fafc; }
          .bg-gray-100 { background: #f1f5f9; }
          .bg-blue-500 { background: #3b82f6; }
          .bg-green-500 { background: #22c55e; }
          .bg-red-500 { background: #ef4444; }
          .bg-yellow-500 { background: #eab308; }
          .text-white { color: #ffffff; }
          .text-gray-500 { color: #64748b; }
          .text-gray-700 { color: #334155; }
          .text-blue-600 { color: #2563eb; }
          .text-green-600 { color: #16a34a; }
          .text-red-600 { color: #dc2626; }
          .shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .shadow-md { box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .overflow-hidden { overflow: hidden; }
          .overflow-auto { overflow: auto; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          tr:hover { background: #f8fafc; }
          input, select, textarea { border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.4rem 0.75rem; font-size: 0.875rem; width: 100%; }
          button { cursor: pointer; border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; transition: opacity 0.15s; }
          button:hover { opacity: 0.85; }
          .btn-primary { background: #3b82f6; color: white; }
          .btn-success { background: #22c55e; color: white; }
          .btn-danger { background: #ef4444; color: white; }
          canvas { max-width: 100%; }
          pre, code { font-family: monospace; font-size: 0.8rem; }
          pre { background: #1e293b; color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
          progress { width: 100%; height: 0.75rem; border-radius: 9999px; }
          .gauge-container { text-align: center; }
        </style>
      </head>
      <body>
        ${code || '<div class="p-4 text-center text-sm text-gray-500">No dynamic widget code provided</div>'}
      </body>
    </html>
  `;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code || html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm text-slate-800 dark:text-zinc-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>{title}</span>
          </h4>
          <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
            {subtitle}
          </div>
        </div>

        {/* Tab switch: View vs Code */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] font-mono font-bold">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'view'
                ? 'bg-white dark:bg-zinc-700 text-violet-700 dark:text-violet-300 shadow-xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Rendered UI</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white dark:bg-zinc-700 text-violet-700 dark:text-violet-300 shadow-xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>AI Code</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === 'view' ? (
        <div className="my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 min-h-[140px]">
          <iframe
            id={`frame-${widgetId}`}
            title={title}
            srcDoc={renderedContent}
            sandbox="allow-scripts"
            className="w-full h-56 border-0"
          />
        </div>
      ) : (
        <div className="my-3 relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-900 text-slate-100 p-3 font-mono text-xs max-h-56 overflow-y-auto">
          <button
            onClick={handleCopyCode}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Copy synthesized code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="text-[11px] leading-relaxed">
            <code>{code || html}</code>
          </pre>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] font-mono text-slate-400 dark:text-zinc-500">
        <span>Sandboxed Micro-Frontend</span>
        <span>Zero External Egress</span>
      </div>
    </div>
  );
}
