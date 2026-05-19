import type { CodexData } from './types';

declare global {
  interface Window {
    __CODEX_DATA__?: CodexData;
  }
}
