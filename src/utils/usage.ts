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

const COST_KEYS = ['costUSD', 'totalCost', 'totalCostUSD'] as const;

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

function hasCostField(entry: Record<string, unknown>): boolean {
  return COST_KEYS.some((key) => typeof entry[key] === 'number' && Number.isFinite(entry[key]));
}

function getCost(entry: Record<string, unknown>): number {
  return COST_KEYS.reduce((cost, key) => cost || toNumber(entry[key]), 0);
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
    costUSD: getCost(entry),
  };
}

function withDistributedMissingModelCost(
  models: Array<{ name: string; usage: ModelUsage; hasCost: boolean }>,
  totals: UsageTotals
): Record<string, ModelUsage> {
  const missingCostModels = models.filter((model) => !model.hasCost);
  if (totals.costUSD > 0 && missingCostModels.length > 0) {
    const knownCost = models
      .filter((model) => model.hasCost)
      .reduce((sum, model) => sum + model.usage.costUSD, 0);
    const remainingCost = Math.max(0, totals.costUSD - knownCost);
    const missingTokens = missingCostModels.reduce((sum, model) => sum + model.usage.totalTokens, 0);

    missingCostModels.forEach((model) => {
      model.usage.costUSD = missingTokens > 0
        ? remainingCost * (model.usage.totalTokens / missingTokens)
        : remainingCost / missingCostModels.length;
    });
  }

  return Object.fromEntries(models.map((model) => [model.name, model.usage]));
}

function normalizeModelObject(
  models: Record<string, unknown>,
  totals: UsageTotals
): Record<string, ModelUsage> {
  return withDistributedMissingModelCost(
    Object.entries(models).map(([name, model]) => {
      const modelRecord = typeof model === 'object' && model !== null ? model as Record<string, unknown> : {};
      return {
        name,
        hasCost: hasCostField(modelRecord),
        usage: {
          ...normalizeTotals(modelRecord),
          isFallback: Boolean(modelRecord.isFallback),
        },
      };
    }),
    totals
  );
}

function normalizeModels(entry: Record<string, unknown>, totals: UsageTotals): Record<string, ModelUsage> {
  const breakdown = entry.breakdown;
  if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
    return normalizeModelObject(breakdown as Record<string, unknown>, totals);
  }

  if (entry.models && typeof entry.models === 'object' && !Array.isArray(entry.models)) {
    return normalizeModelObject(entry.models as Record<string, unknown>, totals);
  }

  if (Array.isArray(entry.modelBreakdowns)) {
    const modelEntries = entry.modelBreakdowns
      .map((model) => (typeof model === 'object' && model !== null ? model as Record<string, unknown> : null))
      .filter((model): model is Record<string, unknown> => Boolean(model));

    if (modelEntries.length > 0) {
      return withDistributedMissingModelCost(
        modelEntries.map((model, index) => {
          const name = String(model.model ?? model.modelName ?? model.name ?? `model-${index + 1}`);
          return {
            name,
            hasCost: hasCostField(model),
            usage: {
              ...normalizeTotals(model),
              isFallback: Boolean(model.isFallback),
            },
          };
        }),
        totals
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
        costUSD: totals.costUSD / divisor,
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

type UsageEntry = DailyEntry | MonthlyEntry | SessionEntry;

function filterEntriesBySource<T extends UsageEntry>(entries: T[], source: string): T[] {
  return entries.filter((entry) => getEntrySource(entry) === source);
}

function aggregateSourceTotals(
  source: string,
  monthly: MonthlyEntry[],
  daily: DailyEntry[],
  sessions: SessionEntry[],
  sourceTotals: Map<string, NamedTotal>
) {
  const sourceTotal = getOrCreateTotal(sourceTotals, source, getSourceLabel(source));
  const entries = monthly.length > 0 ? monthly : daily.length > 0 ? daily : sessions;
  entries.forEach((entry) => addUsage(sourceTotal, entry));
  sourceTotal.sessions = sessions.length;
}

function aggregateModelTotals(
  source: string,
  entries: UsageEntry[],
  modelTotals: Map<string, NamedTotal>,
  sourceModelTotals: Map<string, { source: string; sourceLabel: string; model: string; totalTokens: number; costUSD: number }>
) {
  entries.forEach((entry) => {
    Object.entries(entry.models).forEach(([modelName, modelUsage]) => {
      const modelTotal = getOrCreateTotal(modelTotals, modelName, modelName);
      addModelUsage(modelTotal, modelUsage);

      const key = `${source}::${modelName}`;
      const sourceModel = sourceModelTotals.get(key) ?? {
        source,
        sourceLabel: getSourceLabel(source),
        model: modelName,
        totalTokens: 0,
        costUSD: 0,
      };
      sourceModel.totalTokens += modelUsage.totalTokens;
      sourceModel.costUSD += modelUsage.costUSD;
      sourceModelTotals.set(key, sourceModel);
    });
  });
}

function aggregateModelSessionCounts(sessions: SessionEntry[], modelTotals: Map<string, NamedTotal>) {
  sessions.forEach((session) => {
    Object.keys(session.models).forEach((modelName) => {
      getOrCreateTotal(modelTotals, modelName, modelName).sessions += 1;
    });
  });
}

export function summarizeUsage(data: UsageData): UsageSummary {
  const daily = data.daily ?? [];
  const monthly = data.monthly ?? [];
  const sessions = data.sessions ?? [];
  const sourceTotals = new Map<string, NamedTotal>();
  const modelTotals = new Map<string, NamedTotal>();
  const sourceModelTotals = new Map<string, { source: string; sourceLabel: string; model: string; totalTokens: number; costUSD: number }>();
  const dailyBySource = new Map<string, Record<string, string | number>>();
  const dailyByModel = new Map<string, Record<string, string | number>>();

  const sources = new Set<string>();
  [...monthly, ...daily, ...sessions].forEach((entry) => sources.add(getEntrySource(entry)));

  sources.forEach((source) => {
    const sourceMonthly = filterEntriesBySource(monthly, source);
    const sourceDaily = filterEntriesBySource(daily, source);
    const sourceSessions = filterEntriesBySource(sessions, source);
    aggregateSourceTotals(source, sourceMonthly, sourceDaily, sourceSessions, sourceTotals);
    aggregateModelTotals(
      source,
      sourceMonthly.length > 0 ? sourceMonthly : sourceDaily.length > 0 ? sourceDaily : sourceSessions,
      modelTotals,
      sourceModelTotals
    );
    aggregateModelSessionCounts(sourceSessions, modelTotals);
  });

  daily.forEach((entry) => {
    const source = getEntrySource(entry);
    addTrendValue(dailyBySource, entry.date, getSourceLabel(source), entry.totalTokens);
    Object.entries(entry.models).forEach(([modelName, modelUsage]) => {
      addTrendValue(dailyByModel, entry.date, modelName, modelUsage.totalTokens);
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
