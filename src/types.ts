export interface SourceConfig {
  namespace: string;
  label: string;
  defaultPaths: string[];
  envVar: string;
  focusedCommand: string;
}

export interface ModelUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  isFallback: boolean;
}

export interface DailyEntry {
  date: string;
  source?: string;
  agent?: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
  models: Record<string, ModelUsage>;
}

export interface MonthlyEntry {
  month: string;
  source?: string;
  agent?: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
  models: Record<string, ModelUsage>;
}

export interface SessionEntry {
  sessionId: string;
  lastActivity: string;
  sessionFile: string;
  directory: string;
  source?: string;
  agent?: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
  models: Record<string, ModelUsage>;
}

export interface UsageTotals {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
}

export interface UsageData {
  daily?: DailyEntry[];
  monthly?: MonthlyEntry[];
  sessions?: SessionEntry[];
  totals?: UsageTotals;
}

export type CodexData = UsageData;
