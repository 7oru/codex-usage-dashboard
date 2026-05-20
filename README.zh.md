# Local AI Usage Dashboard

> 本地可视化 ccusage 支持的 AI Coding 会话用量，一键导出 AI-Native 工程报告。

**面试时别再空口说"我很会用 AI"了——直接把数据拍桌上。**

[English](README.md) | [中文](README.zh.md)

![Demo](assets/demo.gif)

## 这东西能干啥

面试官问 "说说你怎么用 AI 辅助开发？"

以前你只能嘴上说"我经常用 AI 写代码"，现在你可以打开这个仪表盘，把 **lifetime tokens、峰值用量、最常用模型、不同工具来源** 截个图或者贴一段 Markdown 进简历。

它通过 `ccusage` 读取本地会话日志，在浏览器里跑，不上传、不联网、不要 API Key。

> **Privacy First** —— 你的 prompt、代码、数据，全留在本地。

## 四行命令跑起来

```bash
git clone https://github.com/7oru/codex-usage-dashboard.git
cd codex-usage-dashboard
npm install
npm run export:data   # 扫描所有 ccusage 能检测到的 source
npm run dev           # http://localhost:5173
```

不想开服务？直接打包成静态 HTML，双击就能看：

```bash
npm run build
open dist/index.html
```

## 面试/作品集数据示例

点仪表盘里的 **Download Markdown Report**，自动生成下面这种报告。复制粘贴到 GitHub Profile README、作品集网站或者牛客/知乎帖子都行：

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

**效果**：别人还在写 "熟练使用 AI 编程"，你的简历里直接印着 346.9M tokens。

## 功能一览

- **100% 本地运行** —— 零上传、零配置、零 API Key
- **回溯历史** —— 把以前所有本地 AI coding 会话一次性可视化
- **多 Source 概览** —— 聚合 Codex、Claude Code、OpenClaw、Gemini CLI 等 ccusage 来源
- **多维图表** —— 日/月维度 + input/output/reasoning/cached 拆分
- **模型视图** —— Top models、每日模型趋势、source × model 明细
- **Token 明细** —— 饼图看模型占比、看 token 类型分布
- **Markdown 导出** —— 一键生成可粘贴的报告
- **本地静态构建** —— 打包后直接打开 `dist/index.html`

## 数据从哪来

```
ccusage 支持的本地会话路径
        ↓
  ccusage --json
        ↓
public/data/usage-{daily,monthly,session}.json
        ↓
   浏览器里的 React 仪表盘
```

## 支持的 Source

仪表盘跟随 ccusage 的 source namespace，模型名完全动态读取，所以新增模型不需要改代码。当前 source registry 包括：

`claude`, `codex`, `opencode`, `amp`, `droid`, `codebuff`, `hermes`, `pi`, `goose`, `openclaw`, `kilo`, `kimi`, `qwen`, `copilot`, `gemini`。

Sources 页面会展示每个 source 的默认 session path 或环境变量，方便排查为什么某个工具没有被导出。

## 目录结构

```
codex-usage-dashboard/
├── scripts/
│   ├── export-ccusage-json.sh   # 导出 ccusage JSON
│   └── build.sh                 # 本地静态构建 (esbuild + tailwindcss)
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
│   │   └── useCodexData.ts      # 数据获取 + 手动上传（含 JSON 校验）
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
│       └── usage.ts             # 用量聚合工具
├── package.json
├── tailwind.config.js
└── README.md
```

## 构建与本地预览

### 开发

```bash
npm run dev           # Vite + HMR
```

### 本地静态构建

```bash
npm run build         # 输出 dist/，纯静态文件
```

这个静态构建只用于本地查看。脚本会用 esbuild 打包 JS、用 Tailwind CSS CLI 编译 CSS，然后生成一个可直接打开的 `dist/`：

```bash
open dist/index.html
```

> **本地隐私提醒**：`npm run build` 会把生成的 usage JSON 内联进 `dist/index.html`。除非你明确想公开这些用量数据，否则不要发布 `dist/`。对外分享时建议用页面里的 Markdown 导出，再按需删改。

## 手动导入数据

不想跑脚本？手动生成 JSON 也行：

```bash
npx ccusage@latest daily --json > public/data/usage-daily.json
npx ccusage@latest monthly --json > public/data/usage-monthly.json
npx ccusage@latest session --json > public/data/usage-session.json
```

然后直接把 JSON 文件拖进页面。

旧的 `public/data/codex-*.json` 仍然会作为兼容 fallback 被读取。

## 只导出某个 Source

默认会导出 ccusage 能检测到的所有 source。也可以只看某一个：

```bash
SOURCE=codex npm run export:data
SOURCE=claude npm run export:data
SOURCE=openclaw npm run export:data
```

或者一次导出多个 focused source，并生成 manifest：

```bash
SOURCES=codex,claude,openclaw npm run export:data
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
