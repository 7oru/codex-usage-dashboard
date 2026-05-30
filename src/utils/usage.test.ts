import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ModelUsage, UsageData } from '../types';
import { normalizeUsageData, summarizeUsage, topNames } from './usage';

function rawUsageData(value: unknown): UsageData {
  return value as UsageData;
}

function modelUsage(totalTokens: number, costUSD = 0): ModelUsage {
  return {
    inputTokens: totalTokens,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens,
    costUSD,
    isFallback: false,
  };
}

describe('normalizeUsageData', () => {
  it('normalizes ccusage token aliases, fallback sources, and modelsUsed splits', () => {
    const data = normalizeUsageData(rawUsageData({
      daily: [
        {
          date: '2026-05-01',
          totalInputTokens: 100,
          cacheCreationTokens: 5,
          cacheReadTokens: 15,
          totalOutputTokens: 25,
          reasoningOutputTokens: 10,
          totalCost: 2,
          modelsUsed: ['gpt-5', 'claude-4'],
        },
      ],
    }), 'codex');

    const entry = data.daily?.[0];
    assert.equal(data.daily?.length, 1);
    assert.equal(entry?.source, 'codex');
    assert.equal(entry?.inputTokens, 100);
    assert.equal(entry?.cachedInputTokens, 20);
    assert.equal(entry?.outputTokens, 25);
    assert.equal(entry?.reasoningOutputTokens, 10);
    assert.equal(entry?.totalTokens, 155);
    assert.equal(entry?.costUSD, 2);
    assert.equal(entry?.models['gpt-5'].totalTokens, 78);
    assert.equal(entry?.models['gpt-5'].costUSD, 1);
    assert.equal(entry?.models['gpt-5'].isFallback, false);
    assert.equal(entry?.models['claude-4'].totalTokens, 78);
    assert.equal(entry?.models['claude-4'].costUSD, 1);
    assert.equal(entry?.models['claude-4'].isFallback, false);
  });

  it('distributes missing model costs by token share', () => {
    const data = normalizeUsageData(rawUsageData({
      daily: [
        {
          date: '2026-05-02',
          source: 'codex',
          totalTokens: 100,
          costUSD: 10,
          breakdown: {
            paid: { totalTokens: 20, costUSD: 4 },
            missingA: { totalTokens: 30 },
            missingB: { totalTokens: 50 },
          },
        },
      ],
    }));

    const models = data.daily?.[0].models;
    assert.equal(models?.paid.costUSD, 4);
    assert.equal(models?.missingA.costUSD, 2.25);
    assert.equal(models?.missingB.costUSD, 3.75);
  });
});

describe('summarizeUsage', () => {
  it('aggregates totals by source and model without losing session counts', () => {
    const summary = summarizeUsage({
      daily: [
        {
          date: '2026-05-01',
          source: 'codex',
          inputTokens: 100,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 100,
          costUSD: 1,
          models: { 'gpt-5': modelUsage(100, 1) },
        },
        {
          date: '2026-05-01',
          source: 'openclaw',
          inputTokens: 40,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 40,
          costUSD: 0.4,
          models: { 'minimax-m2.5': modelUsage(40, 0.4) },
        },
      ],
      sessions: [
        {
          sessionId: 'session-1',
          lastActivity: '2026-05-01T12:00:00Z',
          sessionFile: 'session-1.jsonl',
          directory: '/tmp/project',
          source: 'codex',
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 0,
          costUSD: 0,
          models: { 'gpt-5': modelUsage(0) },
        },
      ],
    });

    assert.equal(summary.totals.totalTokens, 140);
    assert.deepEqual(summary.sourceTotals.map(({ name, label, totalTokens, sessions }) => ({
      name,
      label,
      totalTokens,
      sessions,
    })), [
      { name: 'codex', label: 'Codex', totalTokens: 100, sessions: 1 },
      { name: 'openclaw', label: 'OpenClaw', totalTokens: 40, sessions: 0 },
    ]);
    assert.deepEqual(summary.modelTotals.map(({ name, totalTokens, sessions }) => ({
      name,
      totalTokens,
      sessions,
    })), [
      { name: 'gpt-5', totalTokens: 100, sessions: 1 },
      { name: 'minimax-m2.5', totalTokens: 40, sessions: 0 },
    ]);
    assert.deepEqual(summary.sourceModelTotals.map(({ source, sourceLabel, model, totalTokens }) => ({
      source,
      sourceLabel,
      model,
      totalTokens,
    })), [
      { source: 'codex', sourceLabel: 'Codex', model: 'gpt-5', totalTokens: 100 },
      { source: 'openclaw', sourceLabel: 'OpenClaw', model: 'minimax-m2.5', totalTokens: 40 },
    ]);
    assert.deepEqual(summary.dailyBySource, [
      { date: '2026-05-01', Codex: 100, OpenClaw: 40 },
    ]);
    assert.deepEqual(summary.dailyByModel, [
      { date: '2026-05-01', 'gpt-5': 100, 'minimax-m2.5': 40 },
    ]);
    assert.deepEqual(summary.activeSources, ['codex', 'openclaw']);
    assert.deepEqual(summary.activeModels, ['gpt-5', 'minimax-m2.5']);
    assert.deepEqual(topNames(summary.modelTotals, 1), ['gpt-5']);
  });
});
