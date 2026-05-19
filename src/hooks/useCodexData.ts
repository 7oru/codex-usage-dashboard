import { useState, useEffect, useCallback } from 'react';
import type { CodexData } from '../types';

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
    if (inline && (inline.daily || inline.monthly || inline.sessions)) {
      const merged: CodexData = {};
      if (inline.daily) merged.daily = inline.daily;
      if (inline.monthly) merged.monthly = inline.monthly;
      if (inline.totals) merged.totals = inline.totals;
      if (inline.sessions) merged.sessions = inline.sessions;
      if (!cancelled) {
        setData(merged);
        setError(null);
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
      if (dailyRes.status === 'fulfilled') {
        merged.daily = dailyRes.value.daily;
      }
      if (monthlyRes.status === 'fulfilled') {
        merged.monthly = monthlyRes.value.monthly;
        merged.totals = monthlyRes.value.totals;
      }
      if (sessionRes.status === 'fulfilled') {
        merged.sessions = sessionRes.value.sessions;
      }
      if (merged.daily || merged.monthly || merged.sessions) {
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
        if (typeof json !== 'object' || json === null || Array.isArray(json)) {
          throw new Error('Invalid JSON structure');
        }
        const merged: CodexData = { ...data };
        if (Array.isArray(json.daily)) merged.daily = json.daily;
        if (Array.isArray(json.monthly)) merged.monthly = json.monthly;
        if (Array.isArray(json.sessions)) merged.sessions = json.sessions;
        if (typeof json.totals === 'object' && json.totals !== null && !Array.isArray(json.totals)) {
          merged.totals = json.totals;
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
