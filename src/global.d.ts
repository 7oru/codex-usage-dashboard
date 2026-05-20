import type { UsageData } from './types';

declare global {
  interface Window {
    __USAGE_DATA__?: UsageData;
    __CODEX_DATA__?: UsageData;
  }
}
