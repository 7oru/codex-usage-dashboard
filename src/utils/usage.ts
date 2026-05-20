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

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeTotals(entry: Record<string, unknown>): UsageTotals {
  const inputTokens = toNumber(entry.inputTokens) || toNumber(entry.totalInputTokens);
  const cachedInputTokens =
    toNumber(entry.cachedInputTokens) ||
    toNumber(entry.cacheCreationTokens) + toNumber(entry.cacheReadTokens) ||
    toNumber(entry.cacheReadTokens) ||
    toNumber(entry.totalCacheReadTokens);
  const outputTokens = toNumber(entry.outputTokens) || toNumber(entry.totalOutputTokens);
  const reasoningOutputTokens = toNumber(entry.reasoningOutputTokens);

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningOutputTokens,
    totalTokens: toNumber(entry.totalTokens) || inputTokens + cachedInputTokens + outputTokens + reasoningOutputTokens,
    costUSD: toNumber(entry.costUSD) || toNumber(entry.totalCost) || toNumber(entry.totalCostUSD),
  };
}

function normalizeModels(entry: Record<string, unknown>, totals: UsageTotals): Record<string, ModelUsage> {
  const breakdown = entry.breakdown ?? entry.models;
  if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
    return Object.fromEntries(
      Object.entries(breakdown as Record<string, Record<string, unknown>>).map(([name, model]) => {
        const modelTotals = normalizeTotals(model);
        return [
          name,
          {
            ...modelTotals,
            isFallback: Boolean(model.isFallback),
          },
        ];
      })
    );
  }

  if (entry.models && typeof entry.models === 'object' && !Array.isArray(entry.models)) {
    return Object.fromEntries(
      Object.entries(entry.models as Record<string, Record<string, unknown>>).map(([name, model]) => {
        const modelTotals = normalizeTotals(model);
        return [
          name,
          {
            ...modelTotals,
            isFallback: Boolean(model.isFallback),
          },
        ];
      })
    );
  }

  if (Array.isArray(entry.modelBreakdowns)) {
    const modelEntries = entry.modelBreakdowns
      .map((model) => (typeof model === 'object' && model !== null ? model as Record<string, unknown> : null))
      .filter((model): model is Record<string, unknown> => Boolean(model));

    if (modelEntries.length > 0) {
      return Object.fromEntries(
        modelEntries.map((model, index) => {
          const name = String(model.model ?? model.modelName ?? model.name ?? `model-${index + 1}`);
          const modelTotals = normalizeTotals(model);
          return [
            name,
            {
              ...modelTotals,
              isFallback: Boolean(model.isFallback),
            },
          ];
        })
      );
    }
  }

  const modelsUsed = Array.isArray(entry.modelsUsed)
    ? entry.modelsUsed.filter((model): model is string => typeof model === 'string' && model.length > 0)
    : Array.isArray(entry.models)
      ? entry.models.filter((model): model is string => typeof model === 'string' && model.length > 0)
    : [];
  if (modelsUsed.length === 0) return {};

  const divisor = modelsUsed.length;
  return Object.fromEntries(
    modelsUsed.map((name) => [
      name,
      {
        inputTokens: Math.round(totals.inputTokens / divisor),
        cachedInputTokens: Math.round(totals.cachedInputTokens / divisor),
        outputTokens: Math.round(totals.outputTokens / divisor),
        reasoningOutputTokens: Math.round(totals.reasoningOutputTokens / divisor),
        totalTokens: Math.round(totals.totalTokens / divisor),
        isFallback: false,
      },
    ])
  );
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

function normalizeDailyEntry(entry: DailyEntry | Record<string, unknown>, fallbackSource?: string): DailyEntry {
  const record = entry as Record<string, unknown>;
  const totals = normalizeTotals(record);
  return normalizeEntrySource({
    date: String(record.date ?? ''),
    source: typeof record.source === 'string' ? record.source : undefined,
    agent: typeof record.agent === 'string' ? record.agent : undefined,
    ...totals,
    models: normalizeModels(record, totals),
  }, fallbackSource);
}

function normalizeMonthlyEntry(entry: MonthlyEntry | Record<string, unknown>, fallbackSource?: string): MonthlyEntry {
  const record = entry as Record<string, unknown>;
  const totals = normalizeTotals(record);
  return normalizeEntrySource({
    month: String(record.month ?? ''),
    source: typeof record.source === 'string' ? record.source : undefined,
    agent: typeof record.agent === 'string' ? record.agent : undefined,
    ...totals,
    models: normalizeModels(record, totals),
  }, fallbackSource);
}

function normalizeSessionEntry(entry: SessionEntry | Record<string, unknown>, fallbackSource?: string): SessionEntry {
  const record = entry as Record<string, unknown>;
  const totals = normalizeTotals(record);
  return normalizeEntrySource({
    sessionId: String(record.sessionId ?? record.session ?? record.id ?? ''),
    lastActivity: String(record.lastActivity ?? record.date ?? ''),
    sessionFile: String(record.sessionFile ?? record.sessionId ?? record.session ?? record.id ?? ''),
    directory: String(record.directory ?? ''),
    source: typeof record.source === 'string' ? record.source : undefined,
    agent: typeof record.agent === 'string' ? record.agent : undefined,
    ...totals,
    models: normalizeModels(record, totals),
  }, fallbackSource);
}

export function normalizeUsageData(data: UsageData, fallbackSource?: string): UsageData {
  return {
    daily: data.daily?.map((entry) => normalizeDailyEntry(entry, fallbackSource)),
    monthly: data.monthly?.map((entry) => normalizeMonthlyEntry(entry, fallbackSource)),
    sessions: data.sessions?.map((entry) => normalizeSessionEntry(entry, fallbackSource)),
    totals: data.totals ? normalizeTotals(data.totals as unknown as Record<string, unknown>) : undefined,
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
