# Codex Local Usage Dashboard

A local-only dashboard that backfills Codex token usage from `~/.codex/sessions`.

> **Privacy First:** This tool only reads local Codex session logs. It does not upload prompts, responses, code, or usage data anywhere. All processing happens in your browser.

## Features

- **100% Local** — no cloud upload, no API keys required for the dashboard
- **Backfill Historical Sessions** — visualize all your past Codex usage
- **Daily / Monthly / Session Charts** — interactive charts powered by Recharts
- **Token Breakdown** — input / output / reasoning / cached token breakdown
- **Export Markdown Report** — generate a clean report for your portfolio or recruiters
- **Multi-Agent Ready** — designed to support `~/.codex`, `~/.claude`, `~/.cursor`

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd codex-usage-dashboard
npm install
```

### 2. Export Usage Data

The dashboard reads pre-exported JSON files. Run the export script:

```bash
npm run export:data
```

This runs `ccusage` under the hood and writes to `public/data/`:

- `codex-daily.json`
- `codex-monthly.json`
- `codex-session.json`

> Make sure you have Codex sessions in `~/.codex/sessions`. The script uses `npx ccusage` to parse them.

### 3. Start the Dashboard

```bash
npm run dev
```

Open http://localhost:5173

## Data Flow

```
~/.codex/sessions
        ↓
  ccusage --json
        ↓
public/data/{daily,monthly,session}.json
        ↓
   React Dashboard (local browser)
```

## Project Structure

```
codex-usage-dashboard/
├── scripts/
│   ├── export-ccusage-json.sh   # Export ccusage JSON to public/data/
│   └── build.sh                 # Production build (esbuild + tailwindcss)
├── public/
│   └── data/                    # Generated usage JSON (gitignored)
│       └── .gitkeep             # Keeps the directory in git
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   ├── hooks/
│   │   └── useCodexData.ts      # Fetch + manual upload logic
│   └── components/
│       ├── StatsCards.tsx       # Overview cards
│       ├── DailyChart.tsx       # Daily stacked bar chart
│       ├── MonthlyChart.tsx     # Monthly bar + cost chart
│       ├── TokenBreakdown.tsx   # Pie charts for token types & models
│       ├── SessionTable.tsx     # Sortable / expandable session list
│       └── ExportMarkdown.tsx   # Portfolio markdown export
├── package.json
├── tailwind.config.js
└── README.md
```

## Build & Deploy

### Development

```bash
npm run dev           # Vite dev server with HMR
```

### Production

```bash
npm run build         # Generates dist/ (static files)
```

The production build uses **esbuild** to bundle JS and **Tailwind CSS CLI** to compile CSS. Output goes to `dist/`, which can be served by any static host:

```bash
# Preview locally
cd dist && python3 -m http.server 8080

# Or deploy to GitHub Pages, Vercel, Netlify, Nginx, etc.
```

> **Note:** On this machine, Vite's default bundler (Rolldown/Rollup) fails due to macOS code-signing restrictions, so `scripts/build.sh` uses esbuild as a fallback. On most machines, `vite build` works out of the box.

## Manual Data Upload

If you prefer not to run the export script, you can generate JSON manually:

```bash
npx ccusage@latest codex daily --json > public/data/codex-daily.json
npx ccusage@latest codex monthly --json > public/data/codex-monthly.json
npx ccusage@latest codex session --json > public/data/codex-session.json
```

Then drag and drop the JSON files directly into the dashboard UI.

## Custom Agent

You can switch the target agent via environment variable:

```bash
AGENT=claude npm run export:data
AGENT=cursor npm run export:data
```

Or edit `scripts/export-ccusage-json.sh` to add more agents.

## Portfolio Export

Click **Download Markdown Report** to generate a summary like:

```markdown
# Codex Usage Report

- **Lifetime Tokens**: 346.9M
- **Estimated Cost**: $270.71
- **Most Active Day**: 2026-05-08 (132.0M)
- **Average Daily Usage**: 69.3M
- **Most Used Model**: gpt-5.5
```

Perfect for documenting AI-assisted development workflows in your README or portfolio.

## Tech Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [ccusage](https://www.npmjs.com/package/ccusage) for JSON export

## License

MIT
