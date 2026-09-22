'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bot, 
  Database, 
  ShieldCheck,
  Network
} from 'lucide-react';
import useIndraStore from '@/store/indra-store';
import { useApprovalsQuery } from '@/lib/queries';

export default function NavigationMenu() {
  const pathname = usePathname();
  const { setActiveNav } = useIndraStore();
  const { data: pendingApprovals = [] } = useApprovalsQuery();

  const NAV_ITEMS = [
    { 
      id: 'workbench' as const, 
      href: '/workbench',
      label: 'Agent Workbench', 
      icon: Bot,
      desc: 'Sovereign AI Reasoning Workspace'
    },
    { 
      id: 'kb' as const, 
      href: '/kb',
      label: 'Knowledge Base (RAG)', 
      icon: Database,
      desc: 'Plant SOPs & CAD Schematics'
    },
    { 
      id: 'audit' as const, 
      href: '/audit',
      label: 'Merkle Audit Ledger', 
      icon: ShieldCheck,
      desc: 'SHA-256 Chain & 3-Tier HITL',
      badge: pendingApprovals.length > 0 ? `${pendingApprovals.length} pending` : undefined,
    },
  ];

  return (
    <div className="px-2 py-2.5 border-b border-slate-200/70 dark:border-zinc-800/70 space-y-3">
      {/* 1. Core Sovereign Navigation Views */}
      <div>
        <div className="px-2 mb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-zinc-500 font-mono">
          Operational Views
        </div>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all duration-150 text-left ${
                  isActive
                    ? 'text-violet-900 dark:text-violet-200 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/50 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5 font-normal">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
