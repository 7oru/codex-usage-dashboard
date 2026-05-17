import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyEntry } from '../types';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

export default function MonthlyChart({ monthly }: { monthly: MonthlyEntry[] }) {
  const data = useMemo(() => {
    return [...monthly]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        input: m.inputTokens,
        cached: m.cachedInputTokens,
        output: m.outputTokens,
        reasoning: m.reasoningOutputTokens,
        cost: +(m.costUSD ?? 0).toFixed(2),
      }));
  }, [monthly]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-slate-800 font-semibold mb-4">Monthly Usage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis
            yAxisId="tokens"
            tickFormatter={formatTokens}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="cost"
            orientation="right"
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'Cost') return [`$${value}`, String(name)];
              return [formatTokens(Number(value)), String(name)];
            }}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="tokens" dataKey="input" stackId="a" fill="#3b82f6" name="Input" />
          <Bar yAxisId="tokens" dataKey="cached" stackId="a" fill="#60a5fa" name="Cached Input" />
          <Bar yAxisId="tokens" dataKey="output" stackId="a" fill="#10b981" name="Output" />
          <Bar yAxisId="tokens" dataKey="reasoning" stackId="a" fill="#8b5cf6" name="Reasoning" />
          <Bar yAxisId="cost" dataKey="cost" fill="#f59e0b" name="Cost" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
