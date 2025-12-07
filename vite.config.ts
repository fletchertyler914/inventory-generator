import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Plugin to remove crossorigin attribute for Tauri asset protocol compatibility
const removeCrossorigin = () => {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      // Remove crossorigin attribute from all script and link tags
      return html
        .replace(/\s+crossorigin/g, '')
        .replace(/crossorigin\s+/g, '')
        .replace(/crossorigin="anonymous"/g, '')
        .replace(/crossorigin='anonymous'/g, '');
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // For Tauri apps, always use relative paths (required for bundled assets)
  // Tauri's dev server and production builds both work with relative paths
  return {
  base: './',
  plugins: [react(), removeCrossorigin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Enable minification
    minify: 'esbuild',
    // Source maps for debugging (can be disabled in production)
    sourcemap: false,
    // Target modern browsers (Tauri uses Chromium)
    target: 'esnext',
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  };
});
