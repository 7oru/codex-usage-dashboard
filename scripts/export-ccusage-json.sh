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

run_ccusage_export() {
  local source="$1"
  local report="$2"
  local output_file="$3"
  local label="all sources"

  if [[ -n "$source" ]]; then
    label="$source"
    if npx ccusage@latest "$source" "$report" --json > "$output_file" 2>/dev/null; then
      echo "[export] ✓ $output_file ($label $report)"
      return 0
    fi
  else
    if npx ccusage@latest "$report" --json > "$output_file" 2>/dev/null; then
      echo "[export] ✓ $output_file ($label $report)"
      return 0
    fi
  fi

  echo "[export] ✗ Failed to export $report data for $label"
  rm -f "$output_file"
  return 1
}

export_unified() {
  echo "[export] Detecting ccusage data across all supported sources..."
  run_ccusage_export "" daily "$OUTPUT_DIR/usage-daily.json" || true
  run_ccusage_export "" monthly "$OUTPUT_DIR/usage-monthly.json" || true
  run_ccusage_export "" session "$OUTPUT_DIR/usage-session.json" || true
  rm -f "$OUTPUT_DIR/manifest.json"
}

export_source() {
  local source="$1"
  local base_dir="$2"
  local daily_file="$base_dir/${source}-daily.json"
  local monthly_file="$base_dir/${source}-monthly.json"
  local session_file="$base_dir/${source}-session.json"

  run_ccusage_export "$source" daily "$daily_file" || true
  run_ccusage_export "$source" monthly "$monthly_file" || true
  run_ccusage_export "$source" session "$session_file" || true
}

if [[ -n "$SOURCES" ]]; then
  mkdir -p "$SOURCE_OUTPUT_DIR"
  rm -f "$OUTPUT_DIR/manifest.json"
  IFS=',' read -ra SOURCE_LIST <<< "$SOURCES"

  echo "[export] Exporting focused ccusage data for: $SOURCES"
  for source in "${SOURCE_LIST[@]}"; do
    source="$(echo "$source" | xargs)"
    [[ -z "$source" ]] && continue
    export_source "$source" "$SOURCE_OUTPUT_DIR"
  done

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
  " "$OUTPUT_DIR" "$SOURCES"
  echo "[export] ✓ $OUTPUT_DIR/manifest.json"
elif [[ -n "$SOURCE" ]]; then
  echo "[export] Exporting focused ccusage data for: $SOURCE"
  run_ccusage_export "$SOURCE" daily "$OUTPUT_DIR/usage-daily.json" || true
  run_ccusage_export "$SOURCE" monthly "$OUTPUT_DIR/usage-monthly.json" || true
  run_ccusage_export "$SOURCE" session "$OUTPUT_DIR/usage-session.json" || true
  rm -f "$OUTPUT_DIR/manifest.json"
else
  export_unified
fi

echo "[export] Done. Build the static site with: npm run build && open dist/index.html"
