import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CodexData } from '../types';
import { formatTokens } from '../utils/format';

const COLORS = ['#3b82f6', '#60a5fa', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e'];

export default function TokenBreakdown({ data }: { data: CodexData }) {
  const { pieData, modelData } = useMemo(() => {
    const totals = data.totals;
    const pie = totals
      ? [
          { name: 'Input', value: totals.inputTokens },
          { name: 'Cached Input', value: totals.cachedInputTokens },
          { name: 'Output', value: totals.outputTokens },
          { name: 'Reasoning', value: totals.reasoningOutputTokens },
        ].filter((d) => d.value > 0)
      : [];

    const modelMap: Record<string, number> = {};
    data.sessions?.forEach((s) => {
      Object.entries(s.models).forEach(([name, m]) => {
        modelMap[name] = (modelMap[name] ?? 0) + m.totalTokens;
      });
    });

    const models = Object.entries(modelMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { pieData: pie, modelData: models };
  }, [data]);

  if (pieData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-4">Token Type Breakdown</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatTokens(Number(value))}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-4">Model Distribution</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={modelData}
              cx="50%"
              cy="50%"
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {modelData.map((_, index) => (
                <Cell key={`cell2-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatTokens(Number(value))}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
