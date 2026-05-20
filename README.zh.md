# Local AI Usage Dashboard

> 本地可视化 ccusage 支持的 AI Coding 会话用量，一键导出 AI-Native 工程报告。

**把本地 AI-assisted coding 活动变成清晰、可分享的工程指标。**

[English](README.md) | [中文](README.zh.md) | [在线 Sample Dashboard](https://7oru.github.io/local-ai-usage-dashboard/dist-sample/)

![Demo](assets/demo.gif)

## 这东西能干啥

AI-assisted development 很难只凭记忆说清楚。

这个仪表盘会把本地 coding session 转成 **lifetime tokens、峰值用量、最常用模型、不同工具来源** 等可视化数据，也可以导出 Markdown，放进项目记录、作品集、GitHub README 或工作流复盘里。

它通过 `ccusage` 读取本地会话日志，在浏览器里跑，不上传、不联网、不要 API Key。

> **Privacy First** —— 你的 prompt、代码、数据，全留在本地。

## 快速开始

不用 clone，直接生成一个本地静态 HTML dashboard：

```bash
npx github:7oru/local-ai-usage-dashboard
```

它会导出本机 ccusage 数据，把数据内联进一个静态 HTML 文件，然后直接用浏览器打开。不需要开 dev server。

等 npm package 发布后，命令会变成：

```bash
npx local-ai-usage-dashboard
```

本地开发再 clone：

```bash
git clone https://github.com/7oru/local-ai-usage-dashboard.git
cd local-ai-usage-dashboard
npm install
npm run export:data   # 扫描本机所有非零用量的 ccusage source
npm run dev           # http://localhost:5173
```

不想开服务？直接打包成静态 HTML，双击就能看：

```bash
npm run build
open dist/index.html
```

想生成一份可以公开展示的脱敏 demo：

[打开在线 sample dashboard](https://7oru.github.io/local-ai-usage-dashboard/dist-sample/)，或者本地重新生成：

```bash
npm run build:sample
open dist-sample/index.html
```

sample build 使用 `sample-data/usage.json`，里面只有假的 source、session、token 和 cost。GitHub 仓库文件页可能会展示 HTML 源码而不是直接渲染；可以用上面的 GitHub Pages sample，或者 clone 后本地打开这个文件。

## Markdown 导出示例

点仪表盘里的 **Download Markdown Report**，自动生成下面这种报告。可以放进 GitHub Profile README、项目文档、作品集网站或者个人复盘里：

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

这类报告适合用来记录自己的 AI-assisted development 节奏，而不是只留下一句笼统描述。

## 功能一览

- **100% 本地运行** —— 零上传、零配置、零 API Key
- **回溯历史** —— 把以前所有本地 AI coding 会话一次性可视化
- **多 Source 概览** —— 聚合本机所有非零用量的 ccusage source
- **多维图表** —— 日/月维度 + input/output/reasoning/cached 拆分
- **模型视图** —— Top models、每日模型趋势、source × model 明细
- **Token 明细** —— 饼图看模型占比、看 token 类型分布
- **Markdown 导出** —— 一键生成可粘贴的报告
- **本地静态构建** —— 打包后直接打开 `dist/index.html`

## 数据从哪来

```
ccusage 支持的本地会话路径
        ↓
  path gate + ccusage --json
        ↓
public/data/usage-*.json 或 manifest 指向的 public/data/sources/*.json
        ↓
   浏览器里的 React 仪表盘
```

## 支持的 Source

仪表盘跟随 ccusage 的 source namespace，模型名完全动态读取，所以新增模型不需要改代码。当前 source registry 包括：

`claude`, `codex`, `opencode`, `amp`, `droid`, `codebuff`, `hermes`, `pi`, `goose`, `openclaw`, `kilo`, `kimi`, `qwen`, `copilot`, `gemini`。

Sources 页面会展示每个 source 的默认 session path 或环境变量，方便排查为什么某个工具没有被导出。导出脚本会先检查对应本地路径是否存在，再只保留 ccusage JSON 里 `totalTokens` 大于 0 的 source。像 OpenClaw 这种工具即使已经配置，如果本地文件里没有 ccusage 能读到的 token usage，也会被跳过；通过 provider 产生的用量可能会显示在 provider 自己的 source 下，比如 Kimi。

## 目录结构

```
local-ai-usage-dashboard/
├── scripts/
│   ├── export-ccusage-json.sh   # 导出 ccusage JSON
│   └── build.sh                 # 本地静态构建 (esbuild + tailwindcss)
├── sample-data/
│   ├── README.md                # 合成数据说明
│   └── usage.json               # 可以公开的假 demo 数据
├── public/
│   └── data/                    # 生成的数据 (gitignored)
│       └── .gitkeep
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   ├── global.d.ts              # Window.__USAGE_DATA__ 类型声明
│   ├── sources.ts               # ccusage source registry
│   ├── hooks/
│   │   └── useUsageData.ts      # 数据获取 + 手动上传（含 JSON 校验）
│   ├── components/
│   │   ├── StatsCards.tsx       # 概览卡片
│   │   ├── DailyChart.tsx       # 每日堆叠柱状图
│   │   ├── MonthlyChart.tsx     # 月度柱状图 + 费用
│   │   ├── TokenBreakdown.tsx   # Token 类型 & Top 模型饼图
│   │   ├── SourceOverview.tsx   # Source 图表 + 默认路径表
│   │   ├── ModelOverview.tsx    # 模型图表 + source/model 矩阵
│   │   ├── SessionTable.tsx     # 可排序 / 可展开的会话列表
│   │   └── ExportMarkdown.tsx   # Markdown 报告导出
│   └── utils/
│       ├── format.ts            # 共享数字格式化
│       ├── modelColors.ts       # 共享模型配色
│       └── usage.ts             # 用量聚合工具
├── package.json
├── tailwind.config.js
└── README.md
```

## 构建与本地预览

### 一条命令生成本地静态 HTML

```bash
npx github:7oru/local-ai-usage-dashboard
npx github:7oru/local-ai-usage-dashboard --source openclaw
npx github:7oru/local-ai-usage-dashboard --sources codex,openclaw,kimi --output ./ai-usage-dashboard.html
```

CLI 会通过 `ccusage` 导出用量数据，把 JSON 内联进单个静态 HTML 文件，并通过 `file://` 打开，不会启动本地 server。

### 开发

```bash
npm run dev           # Vite + HMR
```

### 本地静态构建

```bash
npm run build         # 输出 dist/，内联真实本地数据
npm run build:sample  # 输出 dist-sample/，内联合成 demo 数据
```

这个静态构建只用于本地查看。脚本会用 esbuild 打包 JS、用 Tailwind CSS CLI 编译 CSS，然后生成一个可直接打开的 `dist/`：

```bash
open dist/index.html
```

> **本地隐私提醒**：`npm run build` 会把生成的 usage JSON 内联进 `dist/index.html`。除非你明确想公开这些用量数据，否则不要发布 `dist/`。对外分享时建议用页面里的 Markdown 导出，再按需删改。

> **脱敏 sample 提醒**：`npm run build:sample` 只读取 `sample-data/usage.json`，输出 `dist-sample/index.html`。这份 fixture 是合成数据，可以进 repo；`dist-sample/` 是可重复生成的产物，默认忽略。

## 手动导入数据

不想跑脚本？也可以手动给某个 source 生成 JSON：

```bash
npx ccusage@latest codex daily --json > public/data/usage-daily.json
npx ccusage@latest codex monthly --json > public/data/usage-monthly.json
npx ccusage@latest codex session --json > public/data/usage-session.json
```

然后直接把 JSON 文件拖进页面。

旧的 `public/data/codex-*.json` 仍然会作为兼容 fallback 被读取。

## 只导出某个 Source

默认会探测所有支持的 source，跳过不存在的本地路径，并且只导出 ccusage token 大于 0 的 source。也可以只看某一个：

```bash
SOURCE=codex npm run export:data
SOURCE=claude npm run export:data
SOURCE=openclaw npm run export:data
```

或者一次导出多个 focused source，并生成 manifest：

```bash
SOURCES=codex,claude,openclaw npm run export:data
```

大多数机器本来就不会有所有 source 的目录。导出脚本也会跳过那些目录存在但 ccusage 报告为 0 token 的 source，避免把“安装过”误判成“有用量”。如果某个 report 卡住，可以缩短单个 report 的超时时间：

```bash
CCUSAGE_REPORT_TIMEOUT_SECONDS=45 npm run export:data
```

## 这个项目是怎么写的

本项目本身就是 **AI-Native 开发** 的实验场。

- **ChatGPT (GPT-5.5 / Codex)** —— 架构设计、需求拆解、方案评审、Code Review
- **Kimi CLI (2.6)** —— 写代码、跑构建、修 bug

整个流程刻意拆成四步：

1. **规划 / 推理**（ChatGPT / Codex）
2. **执行 / 实现**（Kimi CLI）
3. **Code Review & 迭代**（ChatGPT / Codex）
4. **本地试跑 & 检查**（人）—— 看看能不能跑起来、README 有没有问题

用来探索真实工程里的多 Agent 协作模式。

## 技术栈

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [ccusage](https://www.npmjs.com/package/ccusage)

## License

MIT
