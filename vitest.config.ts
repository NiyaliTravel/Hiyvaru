import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false, // shared in-memory PGlite per file; keep runs serial
    testTimeout: 30_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
