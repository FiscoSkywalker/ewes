import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Suites de bout en bout sur une vraie base, lancées en parallèle : le délai par
    // défaut (5 s) fait échouer, par simple charge, les scénarios à nombreuses requêtes.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
