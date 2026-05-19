#!/usr/bin/env bash
set -euo pipefail

# Codex Usage Data Exporter
# Reads local Codex session logs and exports JSON for the dashboard.
#
# Usage:
#   ./scripts/export-ccusage-json.sh
#   AGENT=cursor ./scripts/export-ccusage-json.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/public/data"

mkdir -p "$OUTPUT_DIR"

AGENT="${AGENT:-codex}"

echo "[export] Detecting ${AGENT} usage data..."

# Export daily
if npx ccusage@latest "$AGENT" daily --json > "$OUTPUT_DIR/codex-daily.json" 2>/dev/null; then
  echo "[export] ✓ $OUTPUT_DIR/codex-daily.json"
else
  echo "[export] ✗ Failed to export daily data (ccusage may need an API key for pricing)"
  rm -f "$OUTPUT_DIR/codex-daily.json"
fi

# Export monthly
if npx ccusage@latest "$AGENT" monthly --json > "$OUTPUT_DIR/codex-monthly.json" 2>/dev/null; then
  echo "[export] ✓ $OUTPUT_DIR/codex-monthly.json"
else
  echo "[export] ✗ Failed to export monthly data"
  rm -f "$OUTPUT_DIR/codex-monthly.json"
fi

# Export session
if npx ccusage@latest "$AGENT" session --json > "$OUTPUT_DIR/codex-session.json" 2>/dev/null; then
  echo "[export] ✓ $OUTPUT_DIR/codex-session.json"
else
  echo "[export] ✗ Failed to export session data"
  rm -f "$OUTPUT_DIR/codex-session.json"
fi

echo "[export] Done. Build the static site with: npm run build && open dist/index.html"
