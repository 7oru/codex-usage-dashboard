import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { SessionEntry } from '../types';
import dayjs from 'dayjs';
import { formatTokens, formatUSD } from '../utils/format';
import { getSourceLabel } from '../sources';
import { getEntrySource } from '../utils/usage';

type SortKey = 'date' | 'tokens' | 'cost' | 'source';
type SortDir = 'asc' | 'desc';

export default function SessionTable({ sessions }: { sessions: SessionEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');

  const filterOptions = useMemo(() => {
    const sources = new Set<string>();
    const models = new Set<string>();
    sessions.forEach((session) => {
      sources.add(getEntrySource(session));
      Object.keys(session.models).forEach((model) => models.add(model));
    });
    return {
      sources: [...sources].sort(),
      models: [...models].sort(),
    };
  }, [sessions]);

  const sorted = useMemo(() => {
    const arr = sessions.filter((session) => {
      const sourceMatch = sourceFilter === 'all' || getEntrySource(session) === sourceFilter;
      const modelMatch = modelFilter === 'all' || Object.keys(session.models).includes(modelFilter);
      return sourceMatch && modelMatch;
    });
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') {
        cmp = a.lastActivity.localeCompare(b.lastActivity);
      } else if (sortKey === 'tokens') {
        cmp = a.totalTokens - b.totalTokens;
      } else if (sortKey === 'cost') {
        cmp = a.costUSD - b.costUSD;
      } else if (sortKey === 'source') {
        cmp = getEntrySource(a).localeCompare(getEntrySource(b));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [sessions, sourceFilter, modelFilter, sortKey, sortDir]);

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
      <div className="p-5 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-slate-800 font-semibold">Sessions</h3>
          <p className="text-slate-500 text-sm mt-1">
            {sorted.length} of {sessions.length} sessions shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All sources</option>
            {filterOptions.sources.map((source) => (
              <option key={source} value={source}>{getSourceLabel(source)}</option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All models</option>
            {filterOptions.models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
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
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('source')}
              >
                <span className="inline-flex items-center gap-1">
                  Source <ArrowUpDown size={14} />
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {getSourceLabel(getEntrySource(s))}
                      </span>
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
                      <td colSpan={7} className="px-4 py-3 bg-slate-50">
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
