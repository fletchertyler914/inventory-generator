import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // For Tauri apps, always use relative paths (required for bundled assets)
  // Tauri's dev server and production builds both work with relative paths
  return {
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ELITE: Code splitting for optimal bundle size and performance
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - separate large dependencies
          if (id.includes('node_modules')) {
            // PDF viewer (large, rarely used)
            if (id.includes('@react-pdf-viewer') || id.includes('pdfjs-dist')) {
              return 'pdf-viewer';
            }
            // TipTap editor (large, only used in notes)
            if (id.includes('@tiptap') || id.includes('lowlight') || id.includes('prosemirror')) {
              return 'editor';
            }
            // Tauri plugins (can be lazy loaded)
            if (id.includes('@tauri-apps/plugin')) {
              return 'tauri-plugins';
            }
            // Radix UI components (used throughout)
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }
            // Date utilities
            if (id.includes('date-fns') || id.includes('react-day-picker')) {
              return 'date-utils';
            }
            // Virtual scrolling (used in table)
            if (id.includes('@tanstack/react-virtual')) {
              return 'virtual-scroll';
            }
            // Syntax highlighting (only in code blocks)
            if (id.includes('react-syntax-highlighter') || id.includes('highlight.js')) {
              return 'syntax-highlight';
            }
            // Excel/CSV processing (only in export)
            if (id.includes('xlsx') || id.includes('csv') || id.includes('calamine')) {
              return 'export-utils';
            }
            // React core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Everything else
            return 'vendor';
          }
          
          // Feature-based code splitting
          // Viewer components (large, lazy load)
          if (id.includes('/viewer/') || id.includes('/components/viewer')) {
            return 'viewer';
          }
          // Timeline components
          if (id.includes('/timeline/')) {
            return 'timeline';
          }
          // Findings components
          if (id.includes('/findings/')) {
            return 'findings';
          }
        },
               },
        },
        // Optimize chunk size limits
        chunkSizeWarningLimit: 1000, // 1MB per chunk (reasonable for desktop app)
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
