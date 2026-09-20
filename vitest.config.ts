import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 180000,
    hookTimeout: 180000,
    fileParallelism: false,
    globalSetup: "./tests/globalSetup.ts",
  },
});