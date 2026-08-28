import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.test.js'],
    globals: false,
    environment: 'node',
    // API integration tests run sequentially against the local PG container
    // so they don't race on shared seed state.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 15000,
  },
});
