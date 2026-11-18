import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    restoreMocks: true,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/types/**'],
    },
  },
});
