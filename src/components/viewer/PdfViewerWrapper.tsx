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

  // ELITE: Apply custom CSS to match app theme colors
  // The Viewer component's theme prop handles most styling, but we add wrapper styling
  // to ensure seamless integration with app theme

  return (
    <div className={`w-full h-full ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance]}
          theme={pdfTheme}
        />
      </Worker>
    </div>
  );
}

