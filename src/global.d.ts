import type { UsageData } from './types';

declare global {
  interface Window {
    __USAGE_DATA__?: UsageData;
  }
}
