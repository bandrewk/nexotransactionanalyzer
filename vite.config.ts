import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { version } from "./package.json";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Single source of truth for the version. Hardcoding it in components and in
  // storage.ts let the three copies drift apart across releases.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
