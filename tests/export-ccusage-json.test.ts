import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const repoRoot = path.resolve('.');
const exportScript = path.join(repoRoot, 'scripts', 'export-ccusage-json.sh');

interface Fixture {
  binDir: string;
  codexHome: string;
  kimiHome: string;
  outputDir: string;
  root: string;
}

function createFixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), 'local-ai-usage-dashboard-export-'));
  const binDir = path.join(root, 'bin');
  const codexHome = path.join(root, 'codex-home');
  const kimiHome = path.join(root, 'kimi-home');
  const outputDir = path.join(root, 'out');

  mkdirSync(binDir, { recursive: true });
  mkdirSync(codexHome, { recursive: true });
  mkdirSync(path.join(kimiHome, 'sessions', 's1'), { recursive: true });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(codexHome, 'session.jsonl'), '{}\n');
  writeFileSync(path.join(kimiHome, 'sessions', 's1', 'wire.jsonl'), '{}\n');

  writeFileSync(path.join(binDir, 'npx'), `#!/usr/bin/env bash
set -euo pipefail

if [[ "$1" != "ccusage@latest" ]]; then
  exit 127
fi

source="$2"
report="$3"

case "$source:$report" in
  codex:daily)
    cat <<'JSON'
{"type":"daily","data":[{"date":"2026-05-01","inputTokens":80,"outputTokens":20,"totalTokens":100,"modelsUsed":["gpt-5"]}],"totals":{"inputTokens":80,"outputTokens":20,"totalTokens":100,"costUSD":1}}
JSON
    ;;
  codex:monthly)
    cat <<'JSON'
{"type":"monthly","data":[{"month":"2026-05","inputTokens":80,"outputTokens":20,"totalTokens":100,"modelsUsed":["gpt-5"]}],"totals":{"inputTokens":80,"outputTokens":20,"totalTokens":100,"costUSD":1}}
JSON
    ;;
  codex:session)
    cat <<'JSON'
{"type":"session","data":[{"sessionId":"codex-session","lastActivity":"2026-05-01T12:00:00Z","totalTokens":100,"modelsUsed":["gpt-5"]}],"totals":{"totalTokens":100,"costUSD":1}}
JSON
    ;;
  kimi:daily)
    cat <<'JSON'
{"type":"daily","data":[],"totals":{"totalTokens":0}}
JSON
    ;;
  *)
    exit 1
    ;;
esac
`, { mode: 0o755 });

  return { binDir, codexHome, kimiHome, outputDir, root };
}

function runExport(fixture: Fixture, env: Record<string, string>) {
  return spawnSync('bash', [exportScript], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CODEX_HOME: fixture.codexHome,
      EXPORT_DATA_DONE_MESSAGE: '0',
      KIMI_DATA_DIR: fixture.kimiHome,
      OUTPUT_DIR: fixture.outputDir,
      PATH: `${fixture.binDir}:${process.env.PATH ?? ''}`,
      ...env,
    },
    encoding: 'utf8',
  });
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

describe('export-ccusage-json.sh', () => {
  it('writes focused usage files for a source with local data', () => {
    const fixture = createFixture();
    try {
      const result = runExport(fixture, { SOURCE: 'codex' });
      assert.equal(result.status, 0, result.stderr || result.stdout);

      assert.equal(existsSync(path.join(fixture.outputDir, 'usage-daily.json')), true);
      assert.equal(existsSync(path.join(fixture.outputDir, 'usage-monthly.json')), true);
      assert.equal(existsSync(path.join(fixture.outputDir, 'usage-session.json')), true);
      assert.equal(existsSync(path.join(fixture.outputDir, 'manifest.json')), false);

      assert.deepEqual(readJson(path.join(fixture.outputDir, 'usage-daily.json')), {
        type: 'daily',
        data: [
          {
            date: '2026-05-01',
            inputTokens: 80,
            outputTokens: 20,
            totalTokens: 100,
            modelsUsed: ['gpt-5'],
          },
        ],
        totals: {
          inputTokens: 80,
          outputTokens: 20,
          totalTokens: 100,
          costUSD: 1,
        },
      });
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('writes a manifest bundle and skips zero-token sources', () => {
    const fixture = createFixture();
    try {
      const result = runExport(fixture, { SOURCES: 'codex,kimi' });
      assert.equal(result.status, 0, result.stderr || result.stdout);

      assert.deepEqual(readJson(path.join(fixture.outputDir, 'manifest.json')), {
        sources: [
          {
            source: 'codex',
            daily: 'sources/codex-daily.json',
            monthly: 'sources/codex-monthly.json',
            session: 'sources/codex-session.json',
          },
        ],
      });
      assert.equal(existsSync(path.join(fixture.outputDir, 'sources', 'codex-daily.json')), true);
      assert.equal(existsSync(path.join(fixture.outputDir, 'sources', 'kimi-daily.json')), false);
      assert.match(result.stdout, /kimi \(no usable ccusage data\)/);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
