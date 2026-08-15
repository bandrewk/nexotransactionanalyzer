import { defineConfig } from "vitest/config";
import { version } from "./package.json";

export default defineConfig({
  // Mirrors the define in vite.config.ts so tests see the same version the
  // app is built with.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["node_modules", "dist", "e2e"],
  },
});
