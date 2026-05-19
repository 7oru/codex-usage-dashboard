#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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
rsync -a "$ROOT_DIR/public/" "$ROOT_DIR/dist/" 2>/dev/null || cp -r "$ROOT_DIR/public/"* "$ROOT_DIR/dist/" 2>/dev/null || true

echo "[build] Inline JSON data..."
INLINE_JSON=$(
  node -e "
    const fs = require('fs');
    const path = require('path');
    const root = '$ROOT_DIR';
    const data = {};
    const files = [
      { file: 'dist/data/codex-daily.json', key: 'daily', extract: 'daily' },
      { file: 'dist/data/codex-monthly.json', key: 'monthly', extract: 'monthly' },
      { file: 'dist/data/codex-monthly.json', key: 'totals', extract: 'totals' },
      { file: 'dist/data/codex-session.json', key: 'sessions', extract: 'sessions' },
    ];
    for (const f of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(root, f.file), 'utf8'));
        if (content[f.extract] !== undefined) {
          data[f.key] = content[f.extract];
        }
      } catch (e) {}
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
    <title>Codex Local Usage Dashboard</title>
    <link rel="stylesheet" href="./assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>window.__CODEX_DATA__ = ${INLINE_JSON};</script>
    <script src="./assets/index.js"></script>
  </body>
</html>
EOF

echo "[build] Done. Output: $ROOT_DIR/dist/"
