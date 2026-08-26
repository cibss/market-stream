import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    environment: "jsdom",

    setupFiles: ["./test/setup.ts"],

    /**
     * Vitest owns only unit and integration tests.
     *
     * Playwright E2E tests live under test/e2e
     * and must never be loaded by Vitest.
     */
    include: [
      "test/unit/**/*.test.ts",
      "test/unit/**/*.test.tsx",
      "test/integration/**/*.test.ts",
      "test/integration/**/*.test.tsx",
    ],

    exclude: ["test/e2e/**", "node_modules/**", ".next/**"],

    clearMocks: true,

    restoreMocks: true,

    coverage: {
      provider: "v8",

      reporter: ["text", "html"],

      include: ["features/**/*.ts", "lib/**/*.ts"],

      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    },
  },
});
