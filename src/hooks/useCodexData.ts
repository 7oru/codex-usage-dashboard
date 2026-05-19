import { useState, useEffect, useCallback } from 'react';
import type { CodexData } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeUsageJson(target: CodexData, json: unknown): boolean {
  if (!isRecord(json)) return false;

  let foundUsageData = false;
  if (Array.isArray(json.daily)) {
    target.daily = json.daily as CodexData['daily'];
    foundUsageData = true;
  }
  if (Array.isArray(json.monthly)) {
    target.monthly = json.monthly as CodexData['monthly'];
    foundUsageData = true;
  }
  if (Array.isArray(json.sessions)) {
    target.sessions = json.sessions as CodexData['sessions'];
    foundUsageData = true;
  }
  if (isRecord(json.totals)) {
    target.totals = json.totals as CodexData['totals'];
  }

  return foundUsageData;
}

function hasUsageData(data: CodexData): boolean {
  return Boolean(data.daily || data.monthly || data.sessions);
}

export function useCodexData() {
  const [data, setData] = useState<CodexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromUrl = useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const inline = (typeof window !== 'undefined' && window.__CODEX_DATA__) || null;
    if (inline) {
      const merged: CodexData = {};
      mergeUsageJson(merged, inline);
      if (!cancelled) {
        if (hasUsageData(merged)) {
          setData(merged);
          setError(null);
        } else {
          setError('No Codex usage data found. Run `npm run export:data` before building, or upload JSON manually.');
        }
        setLoading(false);
      }
      return () => { cancelled = true; };
    }

    Promise.allSettled([
      loadFromUrl('./data/codex-daily.json'),
      loadFromUrl('./data/codex-monthly.json'),
      loadFromUrl('./data/codex-session.json'),
    ]).then(([dailyRes, monthlyRes, sessionRes]) => {
      if (cancelled) return;
      const merged: CodexData = {};
      if (dailyRes.status === 'fulfilled') mergeUsageJson(merged, dailyRes.value);
      if (monthlyRes.status === 'fulfilled') mergeUsageJson(merged, monthlyRes.value);
      if (sessionRes.status === 'fulfilled') mergeUsageJson(merged, sessionRes.value);
      if (hasUsageData(merged)) {
        setData(merged);
        setError(null);
      } else {
        setError('No Codex usage data found. Run `npm run export:data` first, or upload JSON manually.');
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [loadFromUrl]);

  const uploadData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!isRecord(json)) {
          throw new Error('Invalid JSON structure');
        }
        const merged: CodexData = { ...data };
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
