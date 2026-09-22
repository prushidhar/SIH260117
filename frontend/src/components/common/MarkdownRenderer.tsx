'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';
import GenerativeUIBlock from '@/components/generative-ui/GenerativeUIBlock';
import { parseGenerativeUISpec } from '@/lib/generative-ui/parser';

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy code to clipboard:', err);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-900 text-slate-100 shadow-xs my-3">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="uppercase font-semibold tracking-wider text-slate-300">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-800"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200 selection:bg-violet-900/60">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const customComponents = {
  // Container for code blocks
  pre({ children }: any) {
    return <>{children}</>;
  },
  // Inline code & Block code
  code({ node, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    const isBlock = Boolean(match) || String(children).includes('\n');

    if (!isBlock) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-violet-700 dark:text-violet-300 font-mono text-[12px] border border-slate-200/80 dark:border-zinc-700/80 font-medium"
          {...props}
        >
          {children}
        </code>
      );
    }

    const rawLanguage = match ? match[1] : '';
    const langLower = (rawLanguage || className || '').toLowerCase();
    const isGenUI = langLower.includes('gen-ui') || langLower.includes('genui') || langLower.includes('ui') || langLower.includes('generative-ui');

    if (isGenUI || (langLower.includes('json') && codeString.includes('"component"'))) {
      const spec = parseGenerativeUISpec(codeString);
      if (spec) {
        return <GenerativeUIBlock spec={spec} />;
      }
    }

    return <CodeBlock language={rawLanguage} code={codeString} />;
  },
  // Table support (GFM)
  table({ children }: any) {
    return (
      <div className="my-3.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700/80 shadow-xs">
        <table className="w-full text-left border-collapse text-xs font-sans">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }: any) {
    return (
      <thead className="bg-slate-100/90 dark:bg-zinc-800/90 text-slate-800 dark:text-zinc-200 font-mono text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
        {children}
      </thead>
    );
  },
  tbody({ children }: any) {
    return <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">{children}</tbody>;
  },
  th({ children }: any) {
    return (
      <th className="px-3.5 py-2.5 font-semibold text-slate-700 dark:text-zinc-300">
        {children}
      </th>
    );
  },
  td({ children }: any) {
    return (
      <td className="px-3.5 py-2.5 text-slate-700 dark:text-zinc-300 leading-normal">
        {children}
      </td>
    );
  },
  tr({ children }: any) {
    return (
      <tr className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
        {children}
      </tr>
    );
  },
  // Headings
  h1({ children }: any) {
    return <h1 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 mt-4 mb-2 tracking-tight">{children}</h1>;
  },
  h2({ children }: any) {
    return <h2 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 mt-3.5 mb-2 tracking-tight">{children}</h2>;
  },
  h3({ children }: any) {
    return <h3 className="text-xs font-bold text-violet-700 dark:text-violet-400 mt-3 mb-1 uppercase tracking-wider font-mono">{children}</h3>;
  },
  h4({ children }: any) {
    return <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 mt-2 mb-1 font-mono">{children}</h4>;
  },
  // Lists
  ul({ children }: any) {
    return <ul className="list-disc ml-5 space-y-1.5 my-2.5 text-sm text-slate-700 dark:text-zinc-300">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal ml-5 space-y-1.5 my-2.5 text-sm text-slate-700 dark:text-zinc-300">{children}</ol>;
  },
  li({ children }: any) {
    return <li className="leading-relaxed">{children}</li>;
  },
  // Blockquotes
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-3 border-violet-500 pl-3.5 py-1.5 my-2.5 text-slate-600 dark:text-zinc-400 italic text-sm bg-violet-50/50 dark:bg-violet-950/20 rounded-r-lg">
        {children}
      </blockquote>
    );
  },
  // Hyperlinks
  a({ href, children }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2 font-medium cursor-pointer transition-colors"
      >
        {children}
      </a>
    );
  },
  // Paragraphs & Inline formatting
  p({ children }: any) {
    return <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed my-2">{children}</p>;
  },
  strong({ children }: any) {
    return <strong className="font-bold text-slate-900 dark:text-zinc-100">{children}</strong>;
  },
  hr() {
    return <hr className="my-4 border-t border-slate-200 dark:border-zinc-800" />;
  },
};

export default function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  return (
    <div className="markdown-body text-sm leading-relaxed overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={customComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
