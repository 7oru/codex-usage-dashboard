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
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
  models: Record<string, ModelUsage>;
}

export interface CodexData {
  daily?: DailyEntry[];
  monthly?: MonthlyEntry[];
  sessions?: SessionEntry[];
  totals?: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningOutputTokens: number;
    totalTokens: number;
    costUSD: number;
  };
}
