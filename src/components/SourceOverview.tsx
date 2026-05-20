import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import type { UsageData } from '../types';
import { SUPPORTED_SOURCES } from '../sources';
import { formatTokens, formatUSD } from '../utils/format';
import { summarizeUsage } from '../utils/usage';

export default function SourceOverview({ data }: { data: UsageData }) {
  const summary = summarizeUsage(data);
  const sourceTotals = new Map(summary.sourceTotals.map((source) => [source.name, source]));
  const chartData = summary.sourceTotals.slice(0, 10).map((source) => ({
    source: source.label,
    tokens: source.totalTokens,
    cost: source.costUSD,
  }));

  return (
    <div className="space-y-6 mb-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-slate-800 font-semibold">Usage By Source</h3>
            <p className="text-sm text-slate-500 mt-1">
              Active ccusage sources are detected from exported session data.
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis dataKey="source" type="category" width={120} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip
              formatter={(value, name) => [
                name === 'cost' ? formatUSD(Number(value)) : formatTokens(Number(value)),
                name === 'cost' ? 'Cost' : 'Tokens',
              ]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="tokens" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-slate-800 font-semibold">Supported ccusage Sources</h3>
          <p className="text-sm text-slate-500 mt-1">
            Default paths are shown for setup and troubleshooting; focused exports use the namespace command.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Default Path</th>
                <th className="px-4 py-3">Env</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SUPPORTED_SOURCES.map((source) => {
                const total = sourceTotals.get(source.namespace);
                const active = Boolean(total);
                return (
                  <tr key={source.namespace} className={active ? 'bg-blue-50/30' : undefined}>
                    <td className="px-4 py-3">
                      {active ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <CircleDashed size={16} className="text-slate-300" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{source.label}</div>
                      <div className="text-xs text-slate-500">{source.namespace}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 min-w-[240px]">
                      {source.defaultPaths.join(', ')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{source.envVar}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {total ? formatTokens(total.totalTokens) : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {source.focusedCommand}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
