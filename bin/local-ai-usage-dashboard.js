#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`Local AI Usage Dashboard

Usage:
  local-ai-usage-dashboard [options]

Options:
  --source <name>       Export one ccusage source, such as codex or openclaw
  --sources <list>      Export a comma-separated source list
  --output, -o <path>   Write the dashboard HTML to a file or directory
  --sample              Generate the dashboard from synthetic sample data
  --no-open             Do not open the generated HTML automatically
  --timeout <seconds>   Per-report ccusage timeout, default: 90
  --help, -h            Show this help
  --version, -v         Show package version

Examples:
  npx local-ai-usage-dashboard
  npx local-ai-usage-dashboard --source openclaw
  npx local-ai-usage-dashboard --sources codex,openclaw,kimi --no-open
`);
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
}

function readFlagValue(args, index, name) {
  const current = args[index];
  const equalsIndex = current.indexOf('=');
  if (equalsIndex !== -1) return { value: current.slice(equalsIndex + 1), nextIndex: index };
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`${name} requires a value`);
  }
  return { value, nextIndex: index + 1 };
}

function parseArgs(argv) {
  const options = {
    open: true,
    timeout: '',
    source: '',
    sources: '',
    output: '',
    sample: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--sample') {
      options.sample = true;
    } else if (arg === '--no-open') {
      options.open = false;
    } else if (arg === '--source' || arg.startsWith('--source=')) {
      const result = readFlagValue(argv, i, '--source');
      options.source = result.value;
      i = result.nextIndex;
    } else if (arg === '--sources' || arg.startsWith('--sources=')) {
      const result = readFlagValue(argv, i, '--sources');
      options.sources = result.value;
      i = result.nextIndex;
    } else if (arg === '--output' || arg === '--out' || arg === '-o' || arg.startsWith('--output=') || arg.startsWith('--out=')) {
      const result = readFlagValue(argv, i, arg.startsWith('-o') ? '-o' : '--output');
      options.output = result.value;
      i = result.nextIndex;
    } else if (arg === '--timeout' || arg.startsWith('--timeout=')) {
      const result = readFlagValue(argv, i, '--timeout');
      options.timeout = result.value;
      i = result.nextIndex;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.source && options.sources) {
    throw new Error('Use either --source or --sources, not both');
  }

  return options;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveOutputFile(output) {
  if (!output) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-ai-usage-dashboard-'));
    return path.join(dir, 'index.html');
  }

  const resolved = path.resolve(process.cwd(), output);
  if (path.extname(resolved).toLowerCase() === '.html') {
    ensureDir(path.dirname(resolved));
    return resolved;
  }

  ensureDir(resolved);
  return path.join(resolved, 'index.html');
}

function rowsFor(content, key) {
  if (Array.isArray(content[key])) return content[key];
  if (Array.isArray(content.data) && content.type === (key === 'sessions' ? 'session' : key)) return content.data;
  return [];
}

function totalsFor(content) {
  return content.totals || content.summary;
}

function mergeContent(data, content, source) {
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
}

function mergeFile(data, file, source) {
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    mergeContent(data, content, source);
  } catch {}
}

function hasUsageData(data) {
  return ['daily', 'monthly', 'sessions'].some((key) => Array.isArray(data[key]) && data[key].length > 0);
}

function collectUsageData(dataDir) {
  const data = {};
  const usageFiles = {
    daily: path.join(dataDir, 'usage-daily.json'),
    monthly: path.join(dataDir, 'usage-monthly.json'),
    session: path.join(dataDir, 'usage-session.json'),
  };

  if (Object.values(usageFiles).some((file) => fs.existsSync(file))) {
    mergeFile(data, usageFiles.daily);
    mergeFile(data, usageFiles.monthly);
    mergeFile(data, usageFiles.session);
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));
    for (const entry of manifest.sources || []) {
      if (entry.daily) mergeFile(data, path.join(dataDir, entry.daily), entry.source);
      if (entry.monthly) mergeFile(data, path.join(dataDir, entry.monthly), entry.source);
      if (entry.session) mergeFile(data, path.join(dataDir, entry.session), entry.source);
    }
  } catch {}

  if (!hasUsageData(data)) {
    mergeFile(data, path.join(dataDir, 'codex-daily.json'), 'codex');
    mergeFile(data, path.join(dataDir, 'codex-monthly.json'), 'codex');
    mergeFile(data, path.join(dataDir, 'codex-session.json'), 'codex');
  }

  return data;
}

function exportUsageData(options) {
  if (options.sample) {
    const data = {};
    mergeFile(data, path.join(packageRoot, 'sample-data', 'usage.json'));
    return data;
  }

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-ai-usage-data-'));
  const env = {
    ...process.env,
    OUTPUT_DIR: outputDir,
    EXPORT_DATA_DONE_MESSAGE: '0',
  };

  if (options.timeout) {
    env.CCUSAGE_REPORT_TIMEOUT_SECONDS = options.timeout;
  }
  if (options.source) {
    env.SOURCE = options.source;
    delete env.SOURCES;
  }
  if (options.sources) {
    env.SOURCES = options.sources;
    delete env.SOURCE;
  }

  const result = spawnSync('bash', [path.join(packageRoot, 'scripts', 'export-ccusage-json.sh')], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error('ccusage export did not find usable local data');
  }

  return collectUsageData(outputDir);
}

function safeInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function safeInlineScript(value) {
  return value.replace(/<\/script>/gi, '<\\/script>');
}

function writeDashboardHtml(data, outputFile) {
  const css = fs.readFileSync(path.join(packageRoot, 'dist-sample', 'assets', 'index.css'), 'utf8');
  const js = fs.readFileSync(path.join(packageRoot, 'dist-sample', 'assets', 'index.js'), 'utf8');
  const favicon = fs.readFileSync(path.join(packageRoot, 'public', 'favicon.svg')).toString('base64');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${favicon}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local AI Usage Dashboard</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>window.__USAGE_DATA__ = ${safeInlineJson(data)};</script>
    <script>${safeInlineScript(js)}</script>
  </body>
</html>
`;

  fs.writeFileSync(outputFile, html);
}

function openFile(file) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'darwin'
    ? [file]
    : platform === 'win32'
      ? ['/c', 'start', '', file]
      : [file];

  const result = spawnSync(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }
  if (options.version) {
    console.log(readPackageJson().version);
    return;
  }

  const outputFile = resolveOutputFile(options.output);
  const data = exportUsageData(options);
  if (!hasUsageData(data)) {
    throw new Error('No ccusage data found. Try --sample, --source <name>, or check your local session paths.');
  }

  writeDashboardHtml(data, outputFile);
  const fileUrl = pathToFileURL(outputFile).href;
  console.log(`[dashboard] Wrote ${outputFile}`);

  if (options.open) {
    if (openFile(outputFile)) {
      console.log('[dashboard] Opened in your default browser');
    } else {
      console.log(`[dashboard] Open this file manually: ${fileUrl}`);
    }
  } else {
    console.log(`[dashboard] Open: ${fileUrl}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`[dashboard] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
