'use client';

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Table, Download, X, Search, CheckCircle2, ArrowUpDown } from 'lucide-react';
import useSpatialStore from '@/store/spatial-store';

interface RowData {
  tag: string;
  param: string;
  symbol: string;
  value: string;
  unit: string;
  status: 'COMPLIANT' | 'OPTIMAL' | 'ELEVATED';
}

const INITIAL_ROWS: RowData[] = [
  { tag: 'HX-4201', param: 'Design Pressure', symbol: 'P', value: '450.0', unit: 'psig', status: 'OPTIMAL' },
  { tag: 'HX-4201', param: 'Outside Diameter', symbol: 'D', value: '8.625', unit: 'in', status: 'OPTIMAL' },
  { tag: 'HX-4201', param: 'Allowable Stress', symbol: 'S', value: '20,000', unit: 'psi', status: 'OPTIMAL' },
  { tag: 'HX-4201', param: 'Corrosion Allowance', symbol: 'c', value: '0.0625', unit: 'in', status: 'OPTIMAL' },
  { tag: 'HX-4201', param: 'Min Wall Req (tm)', symbol: 'tm', value: '0.1582', unit: 'in', status: 'COMPLIANT' },
  { tag: 'HX-4201', param: 'Actual Measured', symbol: 'tact', value: '0.4850', unit: 'in', status: 'COMPLIANT' },
  { tag: 'HX-4201', param: 'Safety Margin', symbol: 'Δt', value: '+0.3268', unit: 'in', status: 'COMPLIANT' },
  { tag: 'HX-4201', param: 'Est Remaining Life', symbol: 'Lrem', value: '45.1', unit: 'years', status: 'COMPLIANT' },
  { tag: 'P-101', param: 'Discharge Pressure', symbol: 'Pdis', value: '78.4', unit: 'psig', status: 'ELEVATED' },
  { tag: 'P-101', param: 'Motor Current', symbol: 'Im', value: '64.2', unit: 'Amps', status: 'OPTIMAL' },
  { tag: 'P-101', param: 'Vibration RMS', symbol: 'Vrms', value: '3.8', unit: 'mm/s', status: 'OPTIMAL' },
];

export default function DataTableNode({ id, data }: { id: string; data: any }) {
  const { removeNode } = useSpatialStore();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<RowData[]>(INITIAL_ROWS);

  const filteredRows = rows.filter(
    (r) =>
      r.tag.toLowerCase().includes(search.toLowerCase()) ||
      r.param.toLowerCase().includes(search.toLowerCase()) ||
      r.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Tag,Parameter,Symbol,Value,Unit,Status', ...rows.map((r) => `${r.tag},${r.param},${r.symbol},${r.value},${r.unit},${r.status}`)].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ASME_B31_3_Calculation_Matrix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-[520px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-cyan-500/60 shadow-2xl shadow-cyan-500/10 text-slate-800 dark:text-zinc-200 overflow-hidden font-sans">
      <Handle type="target" position={Position.Left} className="w-3.5 h-3.5 bg-cyan-600 border-2 border-white dark:border-zinc-900 -ml-1.5" />
      <Handle type="source" position={Position.Right} className="w-3.5 h-3.5 bg-cyan-600 border-2 border-white dark:border-zinc-900 -mr-1.5" />
      <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-cyan-600 border-2 border-white dark:border-zinc-900 -mb-1.5" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/60 dark:to-sky-950/60 border-b border-cyan-100 dark:border-cyan-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              {data?.title || 'ASME B31.3 Deterministic Calculation Matrix'}
            </div>
            <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono">
              {data?.subtitle || 'API-570 Remaining Service Life Table'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleExportCSV}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeNode(id)}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter parameters, tags, symbols..."
          className="w-full bg-transparent text-xs text-slate-800 dark:text-zinc-200 focus:outline-none font-mono"
        />
      </div>

      {/* Data Table */}
      <div className="max-h-[260px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead className="bg-slate-100/90 dark:bg-zinc-800/90 text-[10px] uppercase text-slate-600 dark:text-zinc-400 sticky top-0 border-b border-slate-200 dark:border-zinc-700">
            <tr>
              <th className="px-3 py-1.5 font-bold">Tag</th>
              <th className="px-3 py-1.5 font-bold">Parameter</th>
              <th className="px-2 py-1.5 font-bold">Sym</th>
              <th className="px-3 py-1.5 font-bold text-right">Value</th>
              <th className="px-2 py-1.5 font-bold">Unit</th>
              <th className="px-3 py-1.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {filteredRows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="px-3 py-1.5 font-bold text-violet-600 dark:text-violet-400">{row.tag}</td>
                <td className="px-3 py-1.5 text-slate-800 dark:text-zinc-200 font-sans">{row.param}</td>
                <td className="px-2 py-1.5 text-slate-500 italic">{row.symbol}</td>
                <td className="px-3 py-1.5 text-right font-bold text-slate-900 dark:text-zinc-100">{row.value}</td>
                <td className="px-2 py-1.5 text-slate-400 text-[10px]">{row.unit}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      row.status === 'COMPLIANT' || row.status === 'OPTIMAL'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
