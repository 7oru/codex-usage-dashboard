#!/usr/bin/env bash
set -euo pipefail

# ccusage Data Exporter
# Reads local AI coding assistant usage logs and exports JSON for the dashboard.
#
# Usage:
#   ./scripts/export-ccusage-json.sh
#   SOURCE=codex ./scripts/export-ccusage-json.sh
#   SOURCES=codex,claude,openclaw ./scripts/export-ccusage-json.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/public/data"
SOURCE_OUTPUT_DIR="$OUTPUT_DIR/sources"

mkdir -p "$OUTPUT_DIR"

SOURCE="${SOURCE:-${AGENT:-}}"
SOURCES="${SOURCES:-}"
CCUSAGE_REPORT_TIMEOUT_SECONDS="${CCUSAGE_REPORT_TIMEOUT_SECONDS:-90}"
SUPPORTED_SOURCES=(
  claude
  codex
  opencode
  amp
  droid
  codebuff
  hermes
  pi
  goose
  openclaw
  kilo
  kimi
  qwen
  copilot
  gemini
)

EXPORTED_SOURCES=()

path_has_files() {
  local path="$1"
  shift

  [[ -e "$path" ]] || return 1
  find "$path" "$@" -print -quit 2>/dev/null | grep -q .
}

json_has_usage() {
  local file="$1"
  local report="$2"

  node -e "
    const fs = require('fs');
    const file = process.argv[1];
    const report = process.argv[2];
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    const key = report === 'session' ? 'sessions' : report;
    const rows = Array.isArray(json[key]) ? json[key] : Array.isArray(json.data) ? json.data : [];
    const totals = json.totals || json.summary || {};
    const rowTokens = rows.reduce((sum, row) => sum + Number(row.totalTokens || 0), 0);
    const totalTokens = Number(totals.totalTokens || 0);
    process.exit(Math.max(rowTokens, totalTokens) > 0 ? 0 : 1);
  " "$file" "$report"
}

enrich_exported_json() {
  local file="$1"
  local source="$2"
  local report="$3"

  node -e "
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const file = process.argv[1];
    const source = process.argv[2];
    const report = process.argv[3];
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));

    function readKimiModelAliases(root) {
      const aliases = {};
      try {
        const config = fs.readFileSync(path.join(root, 'config.toml'), 'utf8');
        const blocks = config.matchAll(/\\[models\\.\"([^\"]+)\"\\]([\\s\\S]*?)(?=\\n\\[|$)/g);
        for (const match of blocks) {
          const fullName = match[1];
          const body = match[2];
          const model = body.match(/\\nmodel\\s*=\\s*\"([^\"]+)\"/)?.[1];
          const displayName = body.match(/\\ndisplay_name\\s*=\\s*\"([^\"]+)\"/)?.[1];
          if (!displayName) continue;
          aliases[fullName] = displayName;
          if (model) aliases[model] = displayName;
        }
      } catch {}
      return aliases;
    }

    function mapModels(rows, aliases) {
      for (const row of rows) {
        if (Array.isArray(row.modelsUsed)) {
          row.modelsUsed = row.modelsUsed.map((model) => aliases[model] || model);
        }
      }
    }

    function findSessionDir(root, sessionId) {
      const stack = [path.join(root, 'sessions')];
      while (stack.length > 0) {
        const current = stack.pop();
        let entries = [];
        try {
          entries = fs.readdirSync(current, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const fullPath = path.join(current, entry.name);
          if (entry.name === sessionId) return fullPath;
          stack.push(fullPath);
        }
      }
      return null;
    }

    function lastWireTimestamp(sessionDir) {
      const wirePath = path.join(sessionDir, 'wire.jsonl');
      try {
        const lines = fs.readFileSync(wirePath, 'utf8').trim().split('\\n').reverse();
        for (const line of lines) {
          const timestamp = JSON.parse(line).timestamp;
          if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
            return new Date(timestamp * 1000).toISOString();
          }
        }
      } catch {}

      try {
        return fs.statSync(wirePath).mtime.toISOString();
      } catch {
        return '';
      }
    }

    if (source === 'kimi') {
      const root = process.env.KIMI_DATA_DIR || path.join(os.homedir(), '.kimi');
      const aliases = readKimiModelAliases(root);
      const rows = Array.isArray(json[report === 'session' ? 'sessions' : report])
        ? json[report === 'session' ? 'sessions' : report]
        : Array.isArray(json.data)
          ? json.data
          : [];
      mapModels(rows, aliases);

      if (report === 'session') {
        for (const row of rows) {
          if (!row.sessionId) continue;
          const sessionDir = findSessionDir(root, row.sessionId);
          if (!sessionDir) continue;
          row.lastActivity = row.lastActivity || lastWireTimestamp(sessionDir);
          row.directory = row.directory || sessionDir;
          row.sessionFile = row.sessionFile || row.sessionId;
        }
      }
    }

    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\\n');
  " "$file" "$source" "$report"
}

source_has_local_data() {
  local source="$1"

  case "$source" in
    claude)
      path_has_files "${CLAUDE_CONFIG_DIR:-$HOME/.config/claude}/projects" -type f -name '*.jsonl' ||
        path_has_files "$HOME/.claude/projects" -type f -name '*.jsonl'
      ;;
    codex)
      path_has_files "${CODEX_HOME:-$HOME/.codex}/sessions" -type f
      ;;
    opencode)
      path_has_files "${OPENCODE_DATA_DIR:-$HOME/.local/share/opencode}" -type f
      ;;
    amp)
      path_has_files "${AMP_DATA_DIR:-$HOME/.local/share/amp}" -type f
      ;;
    droid)
      path_has_files "${DROID_SESSIONS_DIR:-$HOME/.factory/sessions}" -type f
      ;;
    codebuff)
      path_has_files "${CODEBUFF_DATA_DIR:-$HOME/.config/manicode}" -type f
      ;;
    hermes)
      path_has_files "${HERMES_HOME:-$HOME/.hermes}" -type f
      ;;
    pi)
      path_has_files "${PI_AGENT_DIR:-$HOME/.pi/agent/sessions}" -type f
      ;;
    goose)
      path_has_files "${GOOSE_PATH_ROOT:-$HOME/.local/share/goose}" -type f ||
        path_has_files "$HOME/.config/goose" -type f
      ;;
    openclaw)
      path_has_files "${OPENCLAW_DIR:-$HOME/.openclaw}/agents" -type f -name '*session*.jsonl'
      ;;
    kilo)
      path_has_files "${KILO_DATA_DIR:-$HOME/.local/share/kilo}" -type f -name '*.jsonl'
      ;;
    kimi)
      path_has_files "${KIMI_DATA_DIR:-$HOME/.kimi}/sessions" -type f ||
        path_has_files "${KIMI_DATA_DIR:-$HOME/.kimi}" -type f -name 'wire.jsonl'
      ;;
    qwen)
      path_has_files "${QWEN_DATA_DIR:-$HOME/.qwen}" -type f
      ;;
    copilot)
      [[ -n "${COPILOT_OTEL_FILE_EXPORTER_PATH:-}" && -f "$COPILOT_OTEL_FILE_EXPORTER_PATH" ]]
      ;;
    gemini)
      path_has_files "${GEMINI_DATA_DIR:-$HOME/.gemini/tmp}" -type f
      ;;
    *)
      return 1
      ;;
  esac
}

run_ccusage_export() {
  local source="$1"
  local report="$2"
  local output_file="$3"
  local tmp_file
  local timeout_runner

  tmp_file="$(mktemp)"
  timeout_runner='
    my $timeout = shift @ARGV;
    my $pid = fork();
    die "fork failed\n" unless defined $pid;
    if ($pid == 0) {
      exec @ARGV;
      exit 127;
    }
    my $timed_out = 0;
    local $SIG{ALRM} = sub { $timed_out = 1; kill "TERM", $pid; };
    alarm $timeout;
    waitpid($pid, 0);
    alarm 0;
    exit 124 if $timed_out;
    exit(($? >> 8) || (($? & 127) ? 1 : 0));
  '
  if perl -e "$timeout_runner" "$CCUSAGE_REPORT_TIMEOUT_SECONDS" \
    npx ccusage@latest "$source" "$report" --json > "$tmp_file" 2>/dev/null; then
    if ! json_has_usage "$tmp_file" "$report"; then
      rm -f "$tmp_file" "$output_file"
      return 1
    fi
    enrich_exported_json "$tmp_file" "$source" "$report"
    mv "$tmp_file" "$output_file"
    return 0
  fi

  rm -f "$tmp_file" "$output_file"
  return 1
}

write_manifest() {
  local sources_csv="$1"

  node -e "
    const fs = require('fs');
    const path = require('path');
    const outputDir = process.argv[1];
    const sources = process.argv[2].split(',').map((s) => s.trim()).filter(Boolean);
    const manifest = {
      sources: sources.map((source) => ({
        source,
        daily: 'sources/' + source + '-daily.json',
        monthly: 'sources/' + source + '-monthly.json',
        session: 'sources/' + source + '-session.json',
      })),
    };
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  " "$OUTPUT_DIR" "$sources_csv"

  echo "[export] ✓ $OUTPUT_DIR/manifest.json"
}

export_source() {
  local source="$1"
  local base_dir="$2"
  local daily_file="$base_dir/${source}-daily.json"
  local monthly_file="$base_dir/${source}-monthly.json"
  local session_file="$base_dir/${source}-session.json"
  local exported=0

  run_ccusage_export "$source" daily "$daily_file" && exported=1
  if [[ "$exported" -eq 0 ]]; then
    return 1
  fi

  run_ccusage_export "$source" monthly "$monthly_file" || true
  run_ccusage_export "$source" session "$session_file" || true

  if [[ "$exported" -eq 1 ]]; then
    EXPORTED_SOURCES+=("$source")
    echo "[export] ✓ $source"
    return 0
  fi

  return 1
}

export_sources_to_manifest() {
  local sources=("$@")
  local sources_csv

  rm -rf "$SOURCE_OUTPUT_DIR"
  mkdir -p "$SOURCE_OUTPUT_DIR"
  rm -f "$OUTPUT_DIR/manifest.json" "$OUTPUT_DIR"/usage-*.json
  EXPORTED_SOURCES=()

  for source in "${sources[@]}"; do
    source="$(echo "$source" | xargs)"
    [[ -z "$source" ]] && continue
    if ! source_has_local_data "$source"; then
      echo "[export] - $source (no local data path found)"
      continue
    fi
    export_source "$source" "$SOURCE_OUTPUT_DIR" || true
  done

  if [[ "${#EXPORTED_SOURCES[@]}" -eq 0 ]]; then
    echo "[export] No ccusage source data found."
    return 1
  fi

  sources_csv="$(IFS=','; echo "${EXPORTED_SOURCES[*]}")"
  write_manifest "$sources_csv"
  echo "[export] Exported sources: $sources_csv"
}

if [[ -n "$SOURCES" ]]; then
  IFS=',' read -ra SOURCE_LIST <<< "$SOURCES"
  echo "[export] Exporting focused ccusage data for: $SOURCES"
  export_sources_to_manifest "${SOURCE_LIST[@]}" || true
elif [[ -n "$SOURCE" ]]; then
  echo "[export] Exporting focused ccusage data for: $SOURCE"
  rm -f "$OUTPUT_DIR/manifest.json"
  exported=0
  run_ccusage_export "$SOURCE" daily "$OUTPUT_DIR/usage-daily.json" && echo "[export] ✓ $OUTPUT_DIR/usage-daily.json"
  [[ -f "$OUTPUT_DIR/usage-daily.json" ]] && exported=1
  run_ccusage_export "$SOURCE" monthly "$OUTPUT_DIR/usage-monthly.json" && echo "[export] ✓ $OUTPUT_DIR/usage-monthly.json"
  [[ -f "$OUTPUT_DIR/usage-monthly.json" ]] && exported=1
  run_ccusage_export "$SOURCE" session "$OUTPUT_DIR/usage-session.json" && echo "[export] ✓ $OUTPUT_DIR/usage-session.json"
  [[ -f "$OUTPUT_DIR/usage-session.json" ]] && exported=1
  [[ "$exported" -eq 0 ]] && echo "[export] No ccusage data found for source: $SOURCE"
  rm -f "$OUTPUT_DIR/manifest.json"
else
  echo "[export] Detecting ccusage data by source..."
  export_sources_to_manifest "${SUPPORTED_SOURCES[@]}" || true
fi

echo "[export] Done. Build the static site with: npm run build && open dist/index.html"
