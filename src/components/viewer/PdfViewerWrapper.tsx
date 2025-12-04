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

