import { useState, useEffect, useCallback } from 'react';
import type { UsageData } from '../types';
import { normalizeUsageData } from '../utils/usage';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ManifestEntry {
  source?: string;
  daily?: string;
  monthly?: string;
  session?: string;
}

function coerceCcusageJson(json: Record<string, unknown>): UsageData {
  const data: UsageData = {};

  if (Array.isArray(json.daily)) data.daily = json.daily as UsageData['daily'];
  if (Array.isArray(json.monthly)) data.monthly = json.monthly as UsageData['monthly'];
  if (Array.isArray(json.sessions)) data.sessions = json.sessions as UsageData['sessions'];

  if (Array.isArray(json.data)) {
    if (json.type === 'daily') data.daily = json.data as UsageData['daily'];
    if (json.type === 'monthly') data.monthly = json.data as UsageData['monthly'];
    if (json.type === 'session') data.sessions = json.data as UsageData['sessions'];
  }

  if (isRecord(json.totals)) data.totals = json.totals as UsageData['totals'];
  if (isRecord(json.summary)) data.totals = json.summary as UsageData['totals'];

  return data;
}

function appendArray<T>(target: T[] | undefined, value: T[]): T[] {
  return [...(target ?? []), ...value];
}

function mergeUsageJson(target: UsageData, json: unknown, fallbackSource?: string): boolean {
  if (!isRecord(json)) return false;

  const normalized = normalizeUsageData(coerceCcusageJson(json), fallbackSource);
  let foundUsageData = false;
  if (Array.isArray(normalized.daily)) {
    target.daily = appendArray(target.daily, normalized.daily);
    foundUsageData = true;
  }
  if (Array.isArray(normalized.monthly)) {
    target.monthly = appendArray(target.monthly, normalized.monthly);
    foundUsageData = true;
  }
  if (Array.isArray(normalized.sessions)) {
    target.sessions = appendArray(target.sessions, normalized.sessions);
    foundUsageData = true;
  }
  if (normalized.totals && !fallbackSource) {
    target.totals = normalized.totals;
  }

  return foundUsageData;
}

function hasUsageData(data: UsageData): boolean {
  return Boolean(data.daily || data.monthly || data.sessions);
}

export function useUsageData() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromUrl = useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }, []);

  const loadBundleFromUrls = useCallback(async (urls: { daily: string; monthly: string; session: string }, fallbackSource?: string) => {
    const results = await Promise.allSettled([
      loadFromUrl(urls.daily),
      loadFromUrl(urls.monthly),
      loadFromUrl(urls.session),
    ]);
    const merged: UsageData = {};
    results.forEach((result) => {
      if (result.status === 'fulfilled') mergeUsageJson(merged, result.value, fallbackSource);
    });
    return merged;
  }, [loadFromUrl]);

  const loadManifest = useCallback(async () => {
    const manifest = await loadFromUrl('./data/manifest.json');
    if (!isRecord(manifest) || !Array.isArray(manifest.sources)) return {};

    const sourceResults = await Promise.allSettled(
      (manifest.sources as ManifestEntry[]).map(async (entry) => {
        const source = entry.source;
        const urls = {
          daily: entry.daily ?? '',
          monthly: entry.monthly ?? '',
          session: entry.session ?? '',
        };
        const merged: UsageData = {};
        const results = await Promise.allSettled(
          Object.values(urls)
            .filter(Boolean)
            .map((url) => loadFromUrl(url.startsWith('./') ? url : `./data/${url}`))
        );
        results.forEach((result) => {
          if (result.status === 'fulfilled') mergeUsageJson(merged, result.value, source);
        });
        return merged;
      })
    );

    const merged: UsageData = {};
    sourceResults.forEach((result) => {
      if (result.status === 'fulfilled') mergeUsageJson(merged, result.value);
    });
    return merged;
  }, [loadFromUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const inline = (typeof window !== 'undefined' && window.__USAGE_DATA__) || null;
    if (inline) {
      const merged: UsageData = {};
      mergeUsageJson(merged, inline);
      if (!cancelled) {
        if (hasUsageData(merged)) {
          setData(merged);
          setError(null);
        } else {
          setError('No ccusage data found. Run `npm run export:data` before building, or upload JSON manually.');
        }
        setLoading(false);
      }
      return () => { cancelled = true; };
    }

    Promise.allSettled([
      loadBundleFromUrls({
        daily: './data/usage-daily.json',
        monthly: './data/usage-monthly.json',
        session: './data/usage-session.json',
      }),
      loadManifest(),
      loadBundleFromUrls({
        daily: './data/codex-daily.json',
        monthly: './data/codex-monthly.json',
        session: './data/codex-session.json',
      }, 'codex'),
    ]).then(([usageRes, manifestRes, legacyRes]) => {
      if (cancelled) return;
      const merged: UsageData = {};
      if (usageRes.status === 'fulfilled') mergeUsageJson(merged, usageRes.value);
      if (manifestRes.status === 'fulfilled') mergeUsageJson(merged, manifestRes.value);
      if (!hasUsageData(merged) && legacyRes.status === 'fulfilled') mergeUsageJson(merged, legacyRes.value);
      if (hasUsageData(merged)) {
        setData(merged);
        setError(null);
      } else {
        setError('No ccusage data found. Run `npm run export:data` first, or upload JSON manually.');
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [loadBundleFromUrls, loadManifest]);

  const uploadData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!isRecord(json)) {
          throw new Error('Invalid JSON structure');
        }
        const merged: UsageData = { ...data };
        if (!mergeUsageJson(merged, json)) {
          throw new Error('No recognized usage data');
        }
        setData(merged);
        setError(null);
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }, [data]);

  return { data, loading, error, uploadData };
}
