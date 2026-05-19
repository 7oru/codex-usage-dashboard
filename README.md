# Codex Usage Dashboard

> Visualize your local Codex sessions and export an AI-native engineering report.

**Show recruiters how much AI-assisted coding you actually did.**

[English](README.md) | [中文](README.zh.md)

![Demo](assets/demo.gif)

## Why?

Recruiters ask *"How do you use AI?"* — now you can show them the receipts.

This dashboard reads your local `~/.codex/sessions` logs, crunches the numbers, and produces charts + a downloadable Markdown report you can paste straight into your portfolio, GitHub README, or LinkedIn featured section.

> **Privacy First:** Everything stays local. No cloud upload, no API keys, no data leaves your machine.

## Quick Start

```bash
git clone https://github.com/7oru/codex-usage-dashboard.git
cd codex-usage-dashboard
npm install
npm run export:data   # Scans ~/.codex/sessions
npm run dev           # http://localhost:5173
```

Or build a static version you can open via `file://`:

```bash
npm run build
open dist/index.html
```

## Portfolio Export Example

Click **Download Markdown Report** inside the dashboard to generate a summary like this — real numbers from your actual sessions:

```markdown
# Codex Usage Report

> Generated at 2026-05-19
> Data source: local `~/.codex/sessions`

## Overview

- **Lifetime Tokens**: 346.9M
- **Estimated Cost**: $270.71
- **Most Active Day**: 2026-05-08 (132.0M tokens)
- **Average Daily Usage**: 69.3M
- **Most Used Model**: gpt-5.5

## Daily Breakdown

| Date       | Input   | Cached  | Output  | Reasoning | Total   | Cost   |
|------------|---------|---------|---------|-----------|---------|--------|
| 2026-05-08 | 131.4M  | 124.2M  | 575.2k  | 222.9k    | 132.0M  | $91.24 |
| ...        | ...     | ...     | ...     | ...       | ...     | ...    |
```

Paste it into your portfolio, GitHub profile README, or LinkedIn featured section. Let the numbers speak.

## Features

- **100% Local** — no cloud upload, no API keys required
- **Backfill Historical Sessions** — visualize all your past Codex usage
- **Daily / Monthly / Session Charts** — interactive charts powered by Recharts
- **Token Breakdown** — input / output / reasoning / cached token breakdown
- **Export Markdown Report** — generate a clean report for recruiters or your portfolio
- **Multi-Agent Ready** — designed to support `~/.codex`, `~/.claude`, `~/.cursor`

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
│   ├── global.d.ts              # Window.__CODEX_DATA__ type declarations
│   ├── hooks/
│   │   └── useCodexData.ts      # Fetch + manual upload logic with JSON validation
│   ├── components/
│   │   ├── StatsCards.tsx       # Overview cards
│   │   ├── DailyChart.tsx       # Daily stacked bar chart
│   │   ├── MonthlyChart.tsx     # Monthly bar + cost chart
│   │   ├── TokenBreakdown.tsx   # Pie charts for token types & models
│   │   ├── SessionTable.tsx     # Sortable / expandable session list
│   │   └── ExportMarkdown.tsx   # Portfolio markdown export
│   └── utils/
│       └── format.ts            # Shared number formatting helpers
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
open dist/index.html

# Or deploy to GitHub Pages, Vercel, Netlify, Nginx, etc.
```

> **Note:** The build script (`scripts/build.sh`) uses esbuild + Tailwind CSS CLI to produce a fully static `dist/` folder. JSON data is inlined at build time so the dashboard loads without any `fetch` requests — making it usable directly from `file://`.

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

## AI-Native Development

This project itself was built through an AI-native development workflow.

- **ChatGPT (GPT-5.5 / Codex)** — system design, planning, architecture discussions, and code review
- **Kimi CLI (2.6)** — implementation and execution

The repository serves not only as a usage dashboard, but also as an experiment in **multi-agent software engineering workflows**.

The development process intentionally separated:

1. **Planning / reasoning** (ChatGPT / Codex)
2. **Execution / implementation** (Kimi CLI)
3. **Code review & iteration** (ChatGPT / Codex)
4. **Local run & review** (Human) — make sure it actually works and the README makes sense

to explore practical agent orchestration patterns for real-world software engineering.

## Tech Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [ccusage](https://www.npmjs.com/package/ccusage) for JSON export

## License

MIT
