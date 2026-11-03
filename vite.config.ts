import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The app is fully static: `base: "./"` keeps the build portable under any
// sub-path (GitHub Pages project sites, Cloudflare Pages previews, ...).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    // patterns.json is intentionally large (~460 KB) and lives in public/.
    chunkSizeWarningLimit: 800,
  },
});
