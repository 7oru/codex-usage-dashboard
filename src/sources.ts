import type { SourceConfig } from './types';

export const SUPPORTED_SOURCES: SourceConfig[] = [
  {
    namespace: 'claude',
    label: 'Claude Code',
    defaultPaths: ['~/.config/claude/projects/', '~/.claude/projects/'],
    envVar: 'CLAUDE_CONFIG_DIR',
    focusedCommand: 'ccusage claude daily',
  },
  {
    namespace: 'codex',
    label: 'Codex',
    defaultPaths: ['${CODEX_HOME:-~/.codex}'],
    envVar: 'CODEX_HOME',
    focusedCommand: 'ccusage codex daily',
  },
  {
    namespace: 'opencode',
    label: 'OpenCode',
    defaultPaths: ['${OPENCODE_DATA_DIR:-~/.local/share/opencode}'],
    envVar: 'OPENCODE_DATA_DIR',
    focusedCommand: 'ccusage opencode daily',
  },
  {
    namespace: 'amp',
    label: 'Amp',
    defaultPaths: ['${AMP_DATA_DIR:-~/.local/share/amp}'],
    envVar: 'AMP_DATA_DIR',
    focusedCommand: 'ccusage amp daily',
  },
  {
    namespace: 'droid',
    label: 'Droid',
    defaultPaths: ['${DROID_SESSIONS_DIR:-~/.factory/sessions}'],
    envVar: 'DROID_SESSIONS_DIR',
    focusedCommand: 'ccusage droid daily',
  },
  {
    namespace: 'codebuff',
    label: 'Codebuff',
    defaultPaths: ['${CODEBUFF_DATA_DIR:-~/.config/manicode}'],
    envVar: 'CODEBUFF_DATA_DIR',
    focusedCommand: 'ccusage codebuff daily',
  },
  {
    namespace: 'hermes',
    label: 'Hermes Agent',
    defaultPaths: ['${HERMES_HOME:-~/.hermes}'],
    envVar: 'HERMES_HOME',
    focusedCommand: 'ccusage hermes daily',
  },
  {
    namespace: 'pi',
    label: 'pi-agent',
    defaultPaths: ['${PI_AGENT_DIR:-~/.pi/agent/sessions}'],
    envVar: 'PI_AGENT_DIR',
    focusedCommand: 'ccusage pi daily',
  },
  {
    namespace: 'goose',
    label: 'Goose',
    defaultPaths: ['Standard Goose data roots'],
    envVar: 'GOOSE_PATH_ROOT',
    focusedCommand: 'ccusage goose daily',
  },
  {
    namespace: 'openclaw',
    label: 'OpenClaw',
    defaultPaths: ['${OPENCLAW_DIR:-~/.openclaw}', '~/.clawdbot', '~/.moltbot', '~/.moldbot'],
    envVar: 'OPENCLAW_DIR',
    focusedCommand: 'ccusage openclaw daily',
  },
  {
    namespace: 'kilo',
    label: 'Kilo',
    defaultPaths: ['${KILO_DATA_DIR:-~/.local/share/kilo}'],
    envVar: 'KILO_DATA_DIR',
    focusedCommand: 'ccusage kilo daily',
  },
  {
    namespace: 'kimi',
    label: 'Kimi',
    defaultPaths: ['${KIMI_DATA_DIR:-~/.kimi}', '~/.kimi/sessions'],
    envVar: 'KIMI_DATA_DIR',
    focusedCommand: 'ccusage kimi daily',
  },
  {
    namespace: 'qwen',
    label: 'Qwen',
    defaultPaths: ['${QWEN_DATA_DIR:-~/.qwen}'],
    envVar: 'QWEN_DATA_DIR',
    focusedCommand: 'ccusage qwen daily',
  },
  {
    namespace: 'copilot',
    label: 'Copilot CLI',
    defaultPaths: ['~/.copilot/otel/*.jsonl', '${COPILOT_OTEL_FILE_EXPORTER_PATH:-explicit .jsonl file}'],
    envVar: 'COPILOT_OTEL_FILE_EXPORTER_PATH',
    focusedCommand: 'ccusage copilot daily',
  },
  {
    namespace: 'gemini',
    label: 'Gemini CLI',
    defaultPaths: ['${GEMINI_DATA_DIR:-~/.gemini/tmp}'],
    envVar: 'GEMINI_DATA_DIR',
    focusedCommand: 'ccusage gemini daily',
  },
];

const SOURCE_LABELS = new Map(SUPPORTED_SOURCES.map((source) => [source.namespace, source.label]));

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS.get(source) ?? source;
}

export function normalizeSourceName(source: string | undefined): string {
  return source?.trim().toLowerCase() || 'unknown';
}
