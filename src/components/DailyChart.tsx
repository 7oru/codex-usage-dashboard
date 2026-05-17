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
import type { DailyEntry } from '../types';
import dayjs from 'dayjs';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

export default function DailyChart({ daily }: { daily: DailyEntry[] }) {
  const data = useMemo(() => {
    return [...daily]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: dayjs(d.date).format('MM-DD'),
        input: d.inputTokens,
        cached: d.cachedInputTokens,
        output: d.outputTokens,
        reasoning: d.reasoningOutputTokens,
      }));
  }, [daily]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-slate-800 font-semibold mb-4">Daily Token Usage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis
            tickFormatter={formatTokens}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            formatter={(value, name) => [formatTokens(Number(value)), String(name)]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="input" stackId="a" fill="#3b82f6" name="Input" radius={[0, 0, 0, 0]} />
          <Bar dataKey="cached" stackId="a" fill="#60a5fa" name="Cached Input" radius={[0, 0, 0, 0]} />
          <Bar dataKey="output" stackId="a" fill="#10b981" name="Output" radius={[0, 0, 0, 0]} />
          <Bar dataKey="reasoning" stackId="a" fill="#8b5cf6" name="Reasoning" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
