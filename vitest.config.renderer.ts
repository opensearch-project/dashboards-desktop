import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/renderer/**/*.test.tsx'],
      setupFiles: ['tests/setup.ts', 'tests/setup-dom.ts'],
    },
  }),
);
