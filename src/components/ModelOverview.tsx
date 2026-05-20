import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { UsageData } from '../types';
import { formatTokens, formatUSD } from '../utils/format';
import { summarizeUsage, topNames } from '../utils/usage';
import { getModelColor, getModelTagStyle } from '../utils/modelColors';

export default function ModelOverview({ data }: { data: UsageData }) {
  const summary = summarizeUsage(data);
  const topModels = topNames(summary.modelTotals, 8);
  const chartData = summary.modelTotals.slice(0, 12).map((model) => ({
    model: model.name,
    tokens: model.totalTokens,
    cost: model.costUSD,
  }));

  return (
    <div className="space-y-6 mb-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-slate-800 font-semibold mb-4">Top Models</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis dataKey="model" type="category" width={170} tick={{ fontSize: 12, fill: '#64748b' }} />
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

      {summary.dailyByModel.length > 0 && topModels.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-slate-800 font-semibold mb-4">Daily Model Trend</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={summary.dailyByModel} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tickFormatter={formatTokens} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                formatter={(value) => formatTokens(Number(value))}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {topModels.map((model) => (
                <Bar
                  key={model}
                  dataKey={model}
                  stackId="models"
                  fill={getModelColor(model, topModels)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-slate-800 font-semibold">Model By Source</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Estimated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.sourceModelTotals.slice(0, 50).map((row) => (
                <tr key={`${row.source}-${row.model}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                      style={getModelTagStyle(row.model, topModels)}
                    >
                      {row.model}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.sourceLabel}</td>
                  <td className="px-4 py-3">{formatTokens(row.totalTokens)}</td>
                  <td className="px-4 py-3">{formatUSD(row.costUSD)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
