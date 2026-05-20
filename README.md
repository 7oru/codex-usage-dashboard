# Local AI Usage Dashboard

> Visualize local ccusage-supported AI coding sessions and export an AI-native engineering report.

**Show recruiters how much AI-assisted coding you actually did.**

[English](README.md) | [中文](README.zh.md)

![Demo](assets/demo.gif)

## Why?

Recruiters ask *"How do you use AI?"* — now you can show them the receipts.

This dashboard reads local session logs through `ccusage`, crunches the numbers, and produces charts + a downloadable Markdown report you can paste straight into your portfolio, GitHub README, or LinkedIn featured section.

> **Privacy First:** Everything stays local. No cloud upload, no API keys, no data leaves your machine.

## Quick Start

```bash
git clone https://github.com/7oru/codex-usage-dashboard.git
cd codex-usage-dashboard
npm install
npm run export:data   # Scans local ccusage sources with non-zero usage
npm run dev           # http://localhost:5173
```

Or build a static version you can open via `file://`:

```bash
npm run build
open dist/index.html
```

To generate a publish-safe demo with synthetic data:

[Open the included sample HTML](dist-sample/index.html), or rebuild it locally:

```bash
npm run build:sample
open dist-sample/index.html
```

The sample build uses `sample-data/usage.json`, which contains fake sources, sessions, token counts, and costs only. GitHub may show the HTML source instead of rendering it; cloning the repo and opening the file locally renders the dashboard.

## Portfolio Export Example

Click **Download Markdown Report** inside the dashboard to generate a summary like this — real numbers from your actual sessions:

```markdown
# Local AI Usage Report

> Generated at 2026-05-19
> Data source: local ccusage-supported session logs

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
- **Backfill Historical Sessions** — visualize all your past local AI coding usage
- **Multi-Source Overview** — aggregate any local ccusage source with non-zero usage
- **Daily / Monthly / Session Charts** — interactive charts powered by Recharts
- **Model Views** — top models, daily model trends, and source × model breakdowns
- **Token Breakdown** — input / output / reasoning / cached token breakdown
- **Export Markdown Report** — generate a clean report for recruiters or your portfolio
- **Local Static Build** — build once, then open `dist/index.html` directly

## Data Flow

```
ccusage-supported local session paths
        ↓
  path gate + ccusage --json
        ↓
public/data/usage-*.json or manifest-backed public/data/sources/*.json
        ↓
   React Dashboard (local browser)
```

## Supported Sources

The dashboard follows ccusage source namespaces and keeps model names dynamic, so new models show up without code changes. The source registry currently includes:

`claude`, `codex`, `opencode`, `amp`, `droid`, `codebuff`, `hermes`, `pi`, `goose`, `openclaw`, `kilo`, `kimi`, `qwen`, `copilot`, `gemini`.

Each source is shown in the dashboard with its default session path or environment variable. The export script first checks whether the expected local path exists, then keeps only sources whose ccusage JSON has non-zero `totalTokens`. A configured tool such as OpenClaw may be skipped when its local files do not contain ccusage-readable token usage; provider-level usage may instead appear under the provider's own source, such as Kimi.

## Project Structure

```
codex-usage-dashboard/
├── scripts/
│   ├── export-ccusage-json.sh   # Export ccusage JSON to public/data/
│   └── build.sh                 # Local static build (esbuild + tailwindcss)
├── sample-data/
│   ├── README.md                # Notes for the synthetic fixture
│   └── usage.json               # Safe fake data for demos
├── public/
│   └── data/                    # Generated usage JSON (gitignored)
│       └── .gitkeep             # Keeps the directory in git
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   ├── global.d.ts              # Window.__USAGE_DATA__ type declarations
│   ├── sources.ts               # ccusage source registry
│   ├── hooks/
│   │   └── useUsageData.ts      # Fetch + manual upload logic with JSON validation
│   ├── components/
│   │   ├── StatsCards.tsx       # Overview cards
│   │   ├── DailyChart.tsx       # Daily stacked bar chart
│   │   ├── MonthlyChart.tsx     # Monthly bar + cost chart
│   │   ├── TokenBreakdown.tsx   # Pie charts for token types & top models
│   │   ├── SourceOverview.tsx   # Source chart + default path table
│   │   ├── ModelOverview.tsx    # Model charts + source/model matrix
│   │   ├── SessionTable.tsx     # Sortable / expandable session list
│   │   └── ExportMarkdown.tsx   # Portfolio markdown export
│   └── utils/
│       ├── format.ts            # Shared number formatting helpers
│       ├── modelColors.ts       # Shared model color palette
│       └── usage.ts             # Usage aggregation helpers
├── package.json
├── tailwind.config.js
└── README.md
```

## Build & Local Preview

### Development

```bash
npm run dev           # Vite dev server with HMR
```

### Local static build

```bash
npm run build         # Generates dist/ (static files)
npm run build:sample  # Generates dist-sample/ with synthetic data
```

The static build is meant for local viewing only. It uses **esbuild** to bundle JS and **Tailwind CSS CLI** to compile CSS, then writes a self-contained `dist/` folder:

```bash
open dist/index.html
```

> **Local privacy note:** `npm run build` inlines your generated usage JSON into `dist/index.html`. Do not publish `dist/` unless you intentionally want to share that usage data. For sharing, use the dashboard's Markdown export and edit it as needed.

> **Safe sample note:** `npm run build:sample` uses only `sample-data/usage.json` and writes `dist-sample/index.html`. That fixture is synthetic and safe to commit; the generated `dist-sample/` folder is ignored because it is reproducible.

## Manual Data Upload

If you prefer not to run the export script, you can generate JSON for one source manually:

```bash
npx ccusage@latest codex daily --json > public/data/usage-daily.json
npx ccusage@latest codex monthly --json > public/data/usage-monthly.json
npx ccusage@latest codex session --json > public/data/usage-session.json
```

Then drag and drop the JSON files directly into the dashboard UI.

Legacy `public/data/codex-*.json` files are still accepted as a compatibility fallback.

## Focused Source Export

By default, the script probes every supported source, skips missing local paths, and exports only sources with non-zero ccusage tokens. You can focus on one source:

```bash
SOURCE=codex npm run export:data
SOURCE=claude npm run export:data
SOURCE=openclaw npm run export:data
```

Or export several focused sources into a manifest-backed bundle:

```bash
SOURCES=codex,claude,openclaw npm run export:data
```

Missing source directories are expected on most machines. The export script also skips existing directories that produce zero-token ccusage reports, so an installed tool is not counted as usage by itself. If one report hangs, set a shorter timeout:

```bash
CCUSAGE_REPORT_TIMEOUT_SECONDS=45 npm run export:data
```

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
