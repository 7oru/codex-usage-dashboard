import type {
  DailyEntry,
  ModelUsage,
  MonthlyEntry,
  SessionEntry,
  UsageData,
  UsageTotals,
} from '../types';
import { getSourceLabel, normalizeSourceName } from '../sources';

export interface NamedTotal extends UsageTotals {
  name: string;
  label: string;
  sessions: number;
}

export interface UsageSummary {
  totals: UsageTotals;
  sourceTotals: NamedTotal[];
  modelTotals: NamedTotal[];
  sourceModelTotals: Array<{ source: string; sourceLabel: string; model: string; totalTokens: number; costUSD: number }>;
  dailyBySource: Array<Record<string, string | number>>;
  dailyByModel: Array<Record<string, string | number>>;
  activeSources: string[];
  activeModels: string[];
}

const TOKEN_KEYS = [
  'inputTokens',
  'cachedInputTokens',
  'outputTokens',
  'reasoningOutputTokens',
  'totalTokens',
  'costUSD',
] as const;

function emptyTotals(): UsageTotals {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
    costUSD: 0,
  };
}

function addUsage(target: UsageTotals, entry: Partial<UsageTotals>) {
  TOKEN_KEYS.forEach((key) => {
    target[key] += Number(entry[key] ?? 0);
  });
}

function addModelUsage(target: UsageTotals, model: ModelUsage) {
  addUsage(target, model);
}

export function getEntrySource(entry: { source?: string; agent?: string }): string {
  return normalizeSourceName(entry.source ?? entry.agent);
}

function normalizeEntrySource<T extends { source?: string; agent?: string }>(entry: T, fallbackSource?: string): T {
  const source = getEntrySource(entry);
  if (source !== 'unknown') return entry;
  return { ...entry, source: normalizeSourceName(fallbackSource) };
}

export function normalizeUsageData(data: UsageData, fallbackSource?: string): UsageData {
  return {
    daily: data.daily?.map((entry) => normalizeEntrySource(entry, fallbackSource)),
    monthly: data.monthly?.map((entry) => normalizeEntrySource(entry, fallbackSource)),
    sessions: data.sessions?.map((entry) => normalizeEntrySource(entry, fallbackSource)),
    totals: data.totals,
  };
}

function getBestTotals(data: UsageData): UsageTotals {
  if (data.totals) return { ...emptyTotals(), ...data.totals };

  const totals = emptyTotals();
  const source = data.monthly?.length ? data.monthly : data.daily?.length ? data.daily : data.sessions ?? [];
  source.forEach((entry) => addUsage(totals, entry));
  return totals;
}

function getOrCreateTotal(map: Map<string, NamedTotal>, name: string, label = name): NamedTotal {
  const existing = map.get(name);
  if (existing) return existing;

  const created = { name, label, sessions: 0, ...emptyTotals() };
  map.set(name, created);
  return created;
}

function addTrendValue(
  map: Map<string, Record<string, string | number>>,
  date: string,
  name: string,
  value: number
) {
  const row = map.get(date) ?? { date };
  row[name] = Number(row[name] ?? 0) + value;
  map.set(date, row);
}

function aggregateFromEntries(entries: Array<DailyEntry | MonthlyEntry | SessionEntry>, sourceMap: Map<string, NamedTotal>) {
  entries.forEach((entry) => {
    const source = getEntrySource(entry);
    addUsage(getOrCreateTotal(sourceMap, source, getSourceLabel(source)), entry);
  });
}

export function summarizeUsage(data: UsageData): UsageSummary {
  const sessions = data.sessions ?? [];
  const sourceTotals = new Map<string, NamedTotal>();
  const modelTotals = new Map<string, NamedTotal>();
  const sourceModelTotals = new Map<string, { source: string; sourceLabel: string; model: string; totalTokens: number; costUSD: number }>();
  const dailyBySource = new Map<string, Record<string, string | number>>();
  const dailyByModel = new Map<string, Record<string, string | number>>();

  if (sessions.length > 0) {
    sessions.forEach((session) => {
      const source = getEntrySource(session);
      const sourceTotal = getOrCreateTotal(sourceTotals, source, getSourceLabel(source));
      addUsage(sourceTotal, session);
      sourceTotal.sessions += 1;

      Object.entries(session.models).forEach(([modelName, modelUsage]) => {
        const modelTotal = getOrCreateTotal(modelTotals, modelName, modelName);
        addModelUsage(modelTotal, modelUsage);
        modelTotal.sessions += 1;

        const key = `${source}::${modelName}`;
        const sourceModel = sourceModelTotals.get(key) ?? {
          source,
          sourceLabel: getSourceLabel(source),
          model: modelName,
          totalTokens: 0,
          costUSD: 0,
        };
        sourceModel.totalTokens += modelUsage.totalTokens;
        sourceModel.costUSD += session.costUSD;
        sourceModelTotals.set(key, sourceModel);
      });
    });
  } else {
    aggregateFromEntries(data.monthly?.length ? data.monthly : data.daily ?? [], sourceTotals);
  }

  (data.daily ?? []).forEach((entry) => {
    const source = getEntrySource(entry);
    addTrendValue(dailyBySource, entry.date, getSourceLabel(source), entry.totalTokens);
    Object.entries(entry.models).forEach(([modelName, modelUsage]) => {
      addTrendValue(dailyByModel, entry.date, modelName, modelUsage.totalTokens);
      if (sessions.length === 0) {
        addModelUsage(getOrCreateTotal(modelTotals, modelName, modelName), modelUsage);
      }
    });
  });

  const sortTotals = (a: NamedTotal, b: NamedTotal) => b.totalTokens - a.totalTokens;

  return {
    totals: getBestTotals(data),
    sourceTotals: [...sourceTotals.values()].sort(sortTotals),
    modelTotals: [...modelTotals.values()].sort(sortTotals),
    sourceModelTotals: [...sourceModelTotals.values()].sort((a, b) => b.totalTokens - a.totalTokens),
    dailyBySource: [...dailyBySource.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    dailyByModel: [...dailyByModel.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    activeSources: [...sourceTotals.keys()].sort(),
    activeModels: [...modelTotals.keys()].sort(),
  };
}

export function topNames(totals: NamedTotal[], limit: number): string[] {
  return totals.slice(0, limit).map((item) => item.name);
}
