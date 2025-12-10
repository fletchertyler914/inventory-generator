import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useTheme } from '@/hooks/useTheme';

interface PdfViewerWrapperProps {
  fileUrl: string;
}

export function PdfViewerWrapper({ fileUrl }: PdfViewerWrapperProps) {
  const { resolvedTheme } = useTheme();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  // Map app theme to PDF viewer theme
  // "auto" makes it follow system preference, but we want it to match app theme
  const pdfTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  // Use local worker file from public folder
  // In Tauri, use relative path (Vite serves from public in dev, bundled in production)
  // In browser dev mode, also use relative path
  const workerUrl = './pdf.worker.min.js';

  return (
    <>
      <style>{`
        /* Hide open file button */
        button[data-testid="open__button"],
        button[aria-label*="Open file"],
        button[aria-label*="Open"],
        button[title*="Open file"],
        button[title*="Open"],
        .rpv-core__display--block[aria-label*="Open file"],
        .rpv-core__display--block[aria-label*="Open"],
        [data-testid="open__button"] {
          display: none !important;
        }
        
        /* Hide fullscreen button */
        button[data-testid="full-screen__button"],
        button[aria-label*="Full screen"],
        button[aria-label*="Fullscreen"],
        button[title*="Full screen"],
        button[title*="Fullscreen"],
        .rpv-core__display--block[aria-label*="Full screen"],
        .rpv-core__display--block[aria-label*="Fullscreen"],
        [data-testid="full-screen__button"] {
          display: none !important;
        }

        /* Match PDF viewer to app design system */
        .rpv-core__viewer {
          background-color: var(--background) !important;
          color: var(--foreground) !important;
        }

        /* Toolbar styling */
        .rpv-core__toolbar {
          background-color: var(--card) !important;
          border-bottom: 1px solid var(--border) !important;
        }

        /* Apply border opacity using rgba - light theme uses 30% opacity */
        :root:not(.dark) .rpv-core__toolbar {
          border-bottom-color: color-mix(in srgb, var(--border) 30%, transparent) !important;
        }

        .dark .rpv-core__toolbar {
          border-bottom-color: color-mix(in srgb, var(--border) 40%, transparent) !important;
        }

        /* Buttons in toolbar */
        .rpv-core__toolbar button,
        .rpv-core__toolbar .rpv-core__display--flex button {
          background-color: transparent !important;
          border: 1px solid transparent !important;
          border-radius: 0.35rem !important;
          color: var(--foreground) !important;
          transition: all 0.2s ease !important;
        }

        .rpv-core__toolbar button:hover,
        .rpv-core__toolbar .rpv-core__display--flex button:hover {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }

        .rpv-core__toolbar button:focus,
        .rpv-core__toolbar .rpv-core__display--flex button:focus {
          outline: none !important;
          border-color: color-mix(in srgb, var(--primary) 60%, transparent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent) !important;
        }

        /* Sidebar styling */
        .rpv-core__sidebar {
          background-color: var(--card) !important;
          border-right: 1px solid var(--border) !important;
        }

        :root:not(.dark) .rpv-core__sidebar {
          border-right-color: color-mix(in srgb, var(--border) 30%, transparent) !important;
        }

        .dark .rpv-core__sidebar {
          border-right-color: color-mix(in srgb, var(--border) 40%, transparent) !important;
        }

        /* Sidebar tabs */
        .rpv-core__sidebar-tabs {
          border-bottom: 1px solid var(--border) !important;
        }

        :root:not(.dark) .rpv-core__sidebar-tabs {
          border-bottom-color: color-mix(in srgb, var(--border) 30%, transparent) !important;
        }

        .dark .rpv-core__sidebar-tabs {
          border-bottom-color: color-mix(in srgb, var(--border) 40%, transparent) !important;
        }

        .rpv-core__sidebar-tab {
          background-color: transparent !important;
          color: var(--muted-foreground) !important;
          border-radius: 0.35rem 0.35rem 0 0 !important;
        }

        .rpv-core__sidebar-tab--active {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }

        /* Input fields */
        .rpv-core__input {
          background-color: var(--background) !important;
          border: 1px solid var(--border) !important;
          border-radius: 0.35rem !important;
          color: var(--foreground) !important;
          padding: 0.5rem 0.75rem !important;
        }

        :root:not(.dark) .rpv-core__input {
          border-color: color-mix(in srgb, var(--border) 30%, transparent) !important;
        }

        .dark .rpv-core__input {
          border-color: color-mix(in srgb, var(--border) 40%, transparent) !important;
        }

        .rpv-core__input:focus {
          outline: none !important;
          border-color: color-mix(in srgb, var(--primary) 60%, transparent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent) !important;
        }

        /* Dropdown menus */
        .rpv-core__menu {
          background-color: var(--popover) !important;
          border: 1px solid var(--border) !important;
          border-radius: 0.35rem !important;
          box-shadow: var(--shadow-md) !important;
        }

        :root:not(.dark) .rpv-core__menu {
          border-color: color-mix(in srgb, var(--border) 30%, transparent) !important;
        }

        .dark .rpv-core__menu {
          border-color: color-mix(in srgb, var(--border) 40%, transparent) !important;
        }

        .rpv-core__menu-item {
          color: var(--popover-foreground) !important;
        }

        .rpv-core__menu-item:hover {
          background-color: var(--accent) !important;
          color: var(--accent-foreground) !important;
        }

        /* Page navigation */
        .rpv-core__page-navigation {
          background-color: var(--card) !important;
        }

        /* Page number input */
        .rpv-core__page-navigation input {
          background-color: var(--background) !important;
          border: 1px solid var(--border) !important;
          border-radius: 0.35rem !important;
          color: var(--foreground) !important;
        }

        :root:not(.dark) .rpv-core__page-navigation input {
          border-color: color-mix(in srgb, var(--border) 30%, transparent) !important;
        }

        .dark .rpv-core__page-navigation input {
          border-color: color-mix(in srgb, var(--border) 40%, transparent) !important;
        }

        /* Scrollbar styling to match app */
        .rpv-core__viewer ::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }

        .rpv-core__viewer ::-webkit-scrollbar-track {
          background: var(--muted) !important;
        }

        .rpv-core__viewer ::-webkit-scrollbar-thumb {
          background: var(--border) !important;
          border-radius: 4px !important;
        }

        .rpv-core__viewer ::-webkit-scrollbar-thumb:hover {
          background: color-mix(in srgb, var(--border) 60%, transparent) !important;
        }

        /* PDF canvas/page background */
        .rpv-core__inner-pages {
          background-color: var(--background) !important;
        }

        /* Loading spinner */
        .rpv-core__spinner {
          color: var(--primary) !important;
        }

        /* Progress bar */
        .rpv-core__progress-bar {
          background-color: var(--primary) !important;
        }
      `}</style>
      <div className={`w-full h-full ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
        <Worker workerUrl={workerUrl}>
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance]}
            theme={pdfTheme}
          />
        </Worker>
      </div>
    </>
  );
}

