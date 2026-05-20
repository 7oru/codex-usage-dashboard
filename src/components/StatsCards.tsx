import { useMemo } from 'react';
import {
  Cpu,
  Calendar,
  DollarSign,
  Clock,
  Trophy,
  Layers,
} from 'lucide-react';
import type { UsageData } from '../types';
import dayjs from 'dayjs';
import { formatTokens, formatUSD } from '../utils/format';
import { summarizeUsage } from '../utils/usage';

export default function StatsCards({ data }: { data: UsageData }) {
  const stats = useMemo(() => {
    const summary = summarizeUsage(data);
    const totals = summary.totals;
    const daily = data.daily ?? [];
    const sessions = data.sessions ?? [];

    const lifetimeTokens = totals?.totalTokens ?? 0;
    const lifetimeCost = totals?.costUSD ?? 0;

    const todayStr = dayjs().format('YYYY-MM-DD');
    const todayEntry = daily.find((d) => d.date === todayStr);
    // Fallback to most recent day for static builds with frozen data
    const effectiveToday = todayEntry ?? [...daily].sort((a, b) => b.date.localeCompare(a.date))[0];
    const todayTokens = effectiveToday?.totalTokens ?? 0;

    const monthStr = dayjs().format('YYYY-MM');
    const monthEntry = data.monthly?.find((m) => m.month === monthStr);
    const monthlySorted = [...(data.monthly ?? [])].sort((a, b) => b.month.localeCompare(a.month));
    const effectiveMonth = monthEntry ?? monthlySorted[0];
    const monthTokens = effectiveMonth?.totalTokens ?? 0;

    let longestSessionTokens = 0;
    sessions.forEach((s) => {
      if (s.totalTokens > longestSessionTokens) {
        longestSessionTokens = s.totalTokens;
      }
    });

    return {
      lifetimeTokens,
      lifetimeCost,
      todayTokens,
      monthTokens,
      longestSessionTokens,
      mostUsedModel: summary.modelTotals[0]?.name ?? '-',
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
