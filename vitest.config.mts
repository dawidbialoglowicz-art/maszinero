import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // "server-only" rzuca błąd poza serwerem Reacta; w testach podmieniamy go na pusty moduł
      "server-only": path.resolve(root, "tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    fileParallelism: false,
  },
});
