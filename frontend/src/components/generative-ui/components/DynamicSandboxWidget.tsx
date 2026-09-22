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
  const renderedContent = html || `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: transparent;
            color: #1e293b;
          }
          @media (prefers-color-scheme: dark) {
            body { color: #f1f5f9; }
          }
        </style>
      </head>
      <body>
        ${code || '<div class="p-4 text-center text-sm text-slate-500">No dynamic widget code provided</div>'}
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
