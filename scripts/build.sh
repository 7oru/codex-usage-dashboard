#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

mkdir -p "$ROOT_DIR/dist/assets"

echo "[build] Compiling CSS..."
npx tailwindcss -i "$ROOT_DIR/src/index.css" -o "$ROOT_DIR/dist/assets/index.css" --minify

echo "[build] Bundling JS (no CSS import)..."
cat "$ROOT_DIR/src/main.tsx" | grep -v "import './index.css'" > "$ROOT_DIR/src/main.nocss.tsx"
npx esbuild "$ROOT_DIR/src/main.nocss.tsx" \
  --bundle \
  --outfile="$ROOT_DIR/dist/assets/index.js" \
  --format=iife \
  --platform=browser \
  --loader:.tsx=tsx \
  --jsx=automatic \
  --minify
rm "$ROOT_DIR/src/main.nocss.tsx"

echo "[build] Copying public assets..."
cp "$ROOT_DIR/public/favicon.svg" "$ROOT_DIR/dist/favicon.svg"
rm -f "$ROOT_DIR/dist/data"/codex-*.json "$ROOT_DIR/dist/data"/usage-*.json 2>/dev/null || true

echo "[build] Inline JSON data..."
INLINE_JSON=$(
  node -e "
    const fs = require('fs');
    const path = require('path');
    const root = '$ROOT_DIR';
    const data = {};
    const rowsFor = (content, key) => {
      if (Array.isArray(content[key])) return content[key];
      if (Array.isArray(content.data) && content.type === (key === 'sessions' ? 'session' : key)) return content.data;
      return [];
    };
    const totalsFor = (content) => content.totals || content.summary;
    const mergeFile = (file, source) => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
        for (const key of ['daily', 'monthly', 'sessions']) {
          const rows = rowsFor(content, key);
          if (rows.length > 0) {
            data[key] = [
              ...(data[key] || []),
              ...rows.map((entry) => (
                source && !entry.source && !entry.agent ? { ...entry, source } : entry
              )),
            ];
          }
        }
        if (totalsFor(content) && !source) {
          data.totals = totalsFor(content);
        }
      } catch (e) {}
    };

    const hasUsageFiles = fs.existsSync(path.join(root, 'public/data/usage-daily.json')) ||
      fs.existsSync(path.join(root, 'public/data/usage-monthly.json')) ||
      fs.existsSync(path.join(root, 'public/data/usage-session.json'));

    if (hasUsageFiles) {
      mergeFile('public/data/usage-daily.json');
      mergeFile('public/data/usage-monthly.json');
      mergeFile('public/data/usage-session.json');
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/data/manifest.json'), 'utf8'));
      for (const entry of manifest.sources || []) {
        if (entry.daily) mergeFile(path.join('public/data', entry.daily), entry.source);
        if (entry.monthly) mergeFile(path.join('public/data', entry.monthly), entry.source);
        if (entry.session) mergeFile(path.join('public/data', entry.session), entry.source);
      }
    } catch (e) {}

    if (!data.daily && !data.monthly && !data.sessions) {
      mergeFile('public/data/codex-daily.json', 'codex');
      mergeFile('public/data/codex-monthly.json', 'codex');
      mergeFile('public/data/codex-session.json', 'codex');
    }

    const safe = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
    console.log(safe);
  "
)

echo "[build] Writing index.html..."
cat > "$ROOT_DIR/dist/index.html" <<EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local AI Usage Dashboard</title>
    <link rel="stylesheet" href="./assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>window.__USAGE_DATA__ = ${INLINE_JSON};</script>
    <script src="./assets/index.js"></script>
  </body>
</html>
EOF

echo "[build] Done. Output: $ROOT_DIR/dist/"
