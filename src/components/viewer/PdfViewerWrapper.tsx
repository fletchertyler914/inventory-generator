import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';

// Worker URL - using CDN for Tauri compatibility
const WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.12.0/build/pdf.worker.min.js';

interface PdfViewerWrapperProps {
  fileUrl: string;
}

export function PdfViewerWrapper({ fileUrl }: PdfViewerWrapperProps) {
  // Always call hooks at the top level - React rules
  const { resolvedTheme } = useTheme();

  // Map app theme to PDF viewer theme
  const pdfTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  // Use useState with lazy initializer to create plugin instance once
  // This ensures defaultLayoutPlugin() is called inside the component (respecting hook rules)
  // The lazy initializer function is only called once on mount
  const [pluginInstance] = useState(() => defaultLayoutPlugin());

  // Hide upload/download/open file buttons via CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide Open File button */
      button[aria-label*="Open file"],
      button[title*="Open file"],
      .rpv-core__display--block[data-testid="open__button"],
      .rpv-default-layout__toolbar button[aria-label*="Open"],
      
      /* Hide Download button */
      button[aria-label*="Download"],
      button[title*="Download"],
      .rpv-core__display--block[data-testid="download__button"],
      .rpv-default-layout__toolbar button[aria-label*="Download"],
      
      /* Hide More Actions popover (contains upload) */
      button[aria-label*="More actions"],
      button[title*="More actions"] {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Log for debugging - MUST be before any early returns (React hooks rule)
  useEffect(() => {
    if (fileUrl) {
      console.log('[PdfViewerWrapper] Rendering PDF viewer:', {
        fileUrl: fileUrl.substring(0, 50) + '...',
        pdfTheme,
        hasPlugin: !!pluginInstance,
      });
    }
  }, [fileUrl, pdfTheme]);

  // Validate fileUrl before rendering - AFTER all hooks
  if (!fileUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No PDF file URL provided</div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
      <Worker workerUrl={WORKER_URL}>
        <Viewer
          key={`pdf-viewer-${pdfTheme}-${fileUrl}`}
          fileUrl={fileUrl}
          plugins={[pluginInstance]}
          theme={pdfTheme}
        />
      </Worker>
    </div>
  );
}

