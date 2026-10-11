import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Integration tests receive DATABASE_URL only from the invoking process.
  envDir: fileURLToPath(new URL("./tests/.no-env", import.meta.url)),
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 20_000,
    testTimeout: 20_000,
  },
});
