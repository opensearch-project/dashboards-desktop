// Re-export the OsdApi type from preload — single source of truth
import type { OsdApi } from '../preload/index';

declare global {
  interface Window {
    osd: OsdApi;
  }
}

export {};
