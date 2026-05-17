import { useMemo } from 'react';
import {
  Cpu,
  Calendar,
  DollarSign,
  Clock,
  Trophy,
  Layers,
} from 'lucide-react';
import type { CodexData } from '../types';
import dayjs from 'dayjs';

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${n.toFixed(2)}`;
}

export default function StatsCards({ data }: { data: CodexData }) {
  const stats = useMemo(() => {
    const totals = data.totals;
    const daily = data.daily ?? [];
    const sessions = data.sessions ?? [];

    const lifetimeTokens = totals?.totalTokens ?? 0;
    const lifetimeCost = totals?.costUSD ?? 0;

    const todayStr = dayjs().format('YYYY-MM-DD');
    const todayEntry = daily.find((d) => d.date === todayStr);
    const todayTokens = todayEntry?.totalTokens ?? 0;

    const monthStr = dayjs().format('YYYY-MM');
    const monthEntry = data.monthly?.find((m) => m.month === monthStr);
    const monthTokens = monthEntry?.totalTokens ?? 0;

    let longestSessionTokens = 0;
    let mostUsedModel = '-';
    let modelMax = 0;
    const modelCounts: Record<string, number> = {};

    sessions.forEach((s) => {
      if (s.totalTokens > longestSessionTokens) {
        longestSessionTokens = s.totalTokens;
      }
      Object.entries(s.models).forEach(([name, m]) => {
        modelCounts[name] = (modelCounts[name] ?? 0) + m.totalTokens;
      });
    });

    Object.entries(modelCounts).forEach(([name, count]) => {
      if (count > modelMax) {
        modelMax = count;
        mostUsedModel = name;
      }
    });

    return {
      lifetimeTokens,
      lifetimeCost,
      todayTokens,
      monthTokens,
      longestSessionTokens,
      mostUsedModel,
    };
  }, [data]);

  const cards = [
    {
      label: 'Lifetime Tokens',
      value: formatTokens(stats.lifetimeTokens),
      icon: Cpu,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Today',
      value: formatTokens(stats.todayTokens),
      icon: Calendar,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'This Month',
      value: formatTokens(stats.monthTokens),
      icon: Layers,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Estimated Cost',
      value: formatUSD(stats.lifetimeCost),
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Longest Session',
      value: formatTokens(stats.longestSessionTokens),
      icon: Clock,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: 'Most Used Model',
      value: stats.mostUsedModel,
      icon: Trophy,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${card.bg} ${card.color} mb-3`}>
            <card.icon size={16} />
          </div>
          <div className="text-slate-500 text-xs font-medium mb-1">{card.label}</div>
          <div className="text-slate-900 text-lg font-semibold truncate">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
