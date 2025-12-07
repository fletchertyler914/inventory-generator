import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// Plugin to remove crossorigin attribute for Tauri asset protocol compatibility
const removeCrossorigin = () => {
  return {
    name: "remove-crossorigin",
    transformIndexHtml(html: string) {
      // Remove crossorigin attribute from all script and link tags
      return html
        .replace(/\s+crossorigin/g, "")
        .replace(/crossorigin\s+/g, "")
        .replace(/crossorigin="anonymous"/g, "")
        .replace(/crossorigin='anonymous'/g, "")
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
  // For Tauri apps, always use relative paths (required for bundled assets)
  // Tauri's dev server and production builds both work with relative paths
  return {
    base: "./",
    plugins: [react(), removeCrossorigin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      // Enable minification
      minify: "esbuild",
      // Source maps for debugging (can be disabled in production)
      sourcemap: false,
      // Target modern browsers (Tauri uses Chromium)
      target: "esnext",
      // Optimize chunk splitting for better code splitting
      rollupOptions: {
        output: {
          // Manual chunking for optimal bundle size
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes("node_modules")) {
              // React and React DOM
              if (id.includes("react") || id.includes("react-dom")) {
                return "react-vendor"
              }
              // DND Kit
              if (id.includes("@dnd-kit")) {
                return "dnd-kit"
              }
              // Tauri APIs
              if (id.includes("@tauri-apps")) {
                return "tauri-vendor"
              }
              // Tiptap editor
              if (id.includes("@tiptap")) {
                return "tiptap-vendor"
              }
              // PDF viewer
              if (id.includes("@react-pdf-viewer")) {
                return "pdf-viewer"
              }
              // Radix UI components
              if (id.includes("@radix-ui")) {
                return "radix-ui"
              }
              // Other vendor libraries
              return "vendor"
            }
          },
          // Optimize asset file names
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      // Chunk size warning limit (1MB per chunk is reasonable for desktop app)
      chunkSizeWarningLimit: 1000,
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
  }
})
