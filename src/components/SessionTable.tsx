import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { SessionEntry } from '../types';
import dayjs from 'dayjs';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatUSD(n: number): string {
  return `$${n.toFixed(3)}`;
}

type SortKey = 'date' | 'tokens' | 'cost';
type SortDir = 'asc' | 'desc';

export default function SessionTable({ sessions }: { sessions: SessionEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const arr = [...sessions];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') {
        cmp = a.lastActivity.localeCompare(b.lastActivity);
      } else if (sortKey === 'tokens') {
        cmp = a.totalTokens - b.totalTokens;
      } else if (sortKey === 'cost') {
        cmp = a.costUSD - b.costUSD;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [sessions, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-slate-800 font-semibold">Sessions</h3>
        <p className="text-slate-500 text-sm mt-1">{sessions.length} sessions found</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('date')}
              >
                <span className="inline-flex items-center gap-1">
                  Date <ArrowUpDown size={14} />
                </span>
              </th>
              <th className="px-4 py-3">Session</th>
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('tokens')}
              >
                <span className="inline-flex items-center gap-1">
                  Tokens <ArrowUpDown size={14} />
                </span>
              </th>
              <th className="px-4 py-3">Models</th>
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('cost')}
              >
                <span className="inline-flex items-center gap-1">
                  Cost <ArrowUpDown size={14} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => {
              const isOpen = expanded.has(s.sessionId);
              return (
                <React.Fragment key={s.sessionId}>
                  <tr
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(s.sessionId)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dayjs(s.lastActivity).format('YYYY-MM-DD HH:mm')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 truncate max-w-[200px]">
                      {s.sessionFile}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatTokens(s.totalTokens)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(s.models).map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatUSD(s.costUSD)}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-slate-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="text-slate-500">Input</div>
                            <div className="font-medium text-slate-800">{formatTokens(s.inputTokens)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Cached Input</div>
                            <div className="font-medium text-slate-800">{formatTokens(s.cachedInputTokens)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Output</div>
                            <div className="font-medium text-slate-800">{formatTokens(s.outputTokens)}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Reasoning</div>
                            <div className="font-medium text-slate-800">{formatTokens(s.reasoningOutputTokens)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
