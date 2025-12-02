import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { X, FileText, Image as ImageIcon, File, ChevronLeft, ChevronRight, Maximize2, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { InventoryItem } from '@/types/inventory';
import { fileService, type FileChangeStatus } from '@/services/fileService';
import { MetadataPanel } from '../viewer/MetadataPanel';
import { FileChangeWarning } from '../viewer/FileChangeWarning';
import { DuplicateFileDialog } from '../viewer/DuplicateFileDialog';
import { toast } from '@/hooks/useToast';

// ELITE: Lazy load heavy viewer components for optimal bundle size
const LazyViewer = lazy(() => import('react-viewer').then(m => ({ default: m.default })));
const LazyPdfViewer = lazy(() => import('../viewer/PdfViewerWrapper').then(m => ({ default: m.PdfViewerWrapper })));
const LazyTiptapMarkdownViewer = lazy(() => import('../viewer/TiptapMarkdownViewer').then(m => ({ default: m.TiptapMarkdownViewer })));
const LazyCsvViewer = lazy(() => import('../viewer/CsvViewer').then(m => ({ default: m.CsvViewer })));

interface IntegratedFileViewerProps {
  file: InventoryItem;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  caseId?: string;
  onFileRefresh?: () => void;
}

// File type categories
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif'];
const PDF_EXTENSIONS = ['pdf'];
const TEXT_EXTENSIONS = ['txt', 'log', 'md', 'markdown', 'readme'];
const CODE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'sass', 'less', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'bash', 'zsh', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'dart', 'sql', 'r', 'm', 'pl', 'lua', 'vim', 'ps1', 'bat', 'cmd'];
const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
const CSV_EXTENSIONS = ['csv'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'oga', 'aac', 'flac', 'm4a', 'wma'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];

function getFileType(fileName: string): string {
  if (!fileName || fileName.trim().length === 0) {
    return '';
  }
  
  // Handle files with multiple dots (e.g., "file.2_Sep 25.pdf" or "file.tar.gz")
  const parts = fileName.split('.');
  if (parts.length > 1) {
    // Get the last part that looks like an extension (1-5 chars, alphanumeric)
    // Start from the end and work backwards
    for (let i = parts.length - 1; i > 0; i--) {
      const candidate = (parts[i]?.toLowerCase() || '').trim();
      // Check if it looks like a file extension (1-5 chars, alphanumeric)
      // Allow longer extensions like "docx", "xlsx", "pptx"
      if (candidate.length >= 1 && candidate.length <= 5 && /^[a-z0-9]+$/.test(candidate)) {
        return candidate;
      }
    }
  }
  return '';
}

function getFileCategory(fileName: string): 'image' | 'pdf' | 'text' | 'code' | 'office' | 'csv' | 'video' | 'audio' | 'archive' | 'unknown' {
  const ext = getFileType(fileName);
  
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (OFFICE_EXTENSIONS.includes(ext)) return 'office';
  if (CSV_EXTENSIONS.includes(ext)) return 'csv';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive';
  
  return 'unknown';
}

function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'sh': 'bash',
    'bash': 'bash',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    'r': 'r',
    'm': 'objectivec',
    'pl': 'perl',
    'lua': 'lua',
    'vim': 'vim',
    'ps1': 'powershell',
  };
  
  return langMap[ext] || 'text';
}

/**
 * IntegratedFileViewer - Non-modal file viewer integrated into workspace
 * 
 * ELITE FEATURES:
 * - PDF viewer with full controls (@react-pdf-viewer)
 * - Image viewer with zoom/rotate (react-viewer)
 * - Code viewer with syntax highlighting (react-syntax-highlighter)
 * - Text/Markdown viewer (react-markdown)
 * - Office document viewer (Word, Excel via mammoth/xlsx)
 * - CSV viewer (react-csv-viewer)
 * - Video/Audio players (HTML5 native)
 * - Keyboard navigation (arrow keys, Esc)
 * - Previous/Next file controls
 */
export function IntegratedFileViewer({
  file,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  caseId,
  onFileRefresh,
}: IntegratedFileViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<'image' | 'pdf' | 'text' | 'code' | 'office' | 'csv' | 'video' | 'audio' | 'archive' | 'unknown'>('unknown');
  const [fileContent, setFileContent] = useState<string>('');
  const [imageVisible, setImageVisible] = useState(false);
  const [wordContent, setWordContent] = useState<string>('');
  const [excelData, setExcelData] = useState<Array<Array<string | number | null | undefined>>>([]);
  const [csvData, setCsvData] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [shouldLoadContent, setShouldLoadContent] = useState(false); // ELITE: Lazy load content
  const [metadataPanelOpen, setMetadataPanelOpen] = useState(false);
  const [vscDarkPlusStyle, setVscDarkPlusStyle] = useState<any>(null);
  const [syntaxHighlighterModule, setSyntaxHighlighterModule] = useState<any>(null);
  const [fileChanged, setFileChanged] = useState<FileChangeStatus | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ file_id: string; file_name: string; absolute_path: string; folder_path: string; status: string }>>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // Use file_type from inventory item if available, otherwise extract from file_name
  // ELITE: Robust file type detection with multiple fallbacks
  const fileType = useMemo(() => {
    // Try file_type from database first (might be uppercase)
    if (file.file_type && file.file_type.trim()) {
      const ext = file.file_type.toLowerCase().trim();
      // Remove any leading dots
      const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
      if (cleanExt.length > 0) {
        return cleanExt;
      }
    }
    // Fallback: extract from file_name
    const fromName = getFileType(file.file_name);
    if (fromName) {
      return fromName;
    }
    // Last resort: try to extract from absolute_path
    if (file.absolute_path) {
      const pathExt = getFileType(file.absolute_path);
      if (pathExt) {
        return pathExt;
      }
    }
    return '';
  }, [file.file_name, file.file_type, file.absolute_path]);
  
  const category = useMemo(() => {
    // First try using file_type from inventory (convert to lowercase)
    if (file.file_type && file.file_type.trim()) {
      const ext = file.file_type.toLowerCase().trim();
      const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
      if (cleanExt && cleanExt.length > 0) {
        if (IMAGE_EXTENSIONS.includes(cleanExt)) return 'image';
        if (PDF_EXTENSIONS.includes(cleanExt)) return 'pdf';
        if (TEXT_EXTENSIONS.includes(cleanExt)) return 'text';
        if (CODE_EXTENSIONS.includes(cleanExt)) return 'code';
        if (OFFICE_EXTENSIONS.includes(cleanExt)) return 'office';
        if (CSV_EXTENSIONS.includes(cleanExt)) return 'csv';
        if (VIDEO_EXTENSIONS.includes(cleanExt)) return 'video';
        if (AUDIO_EXTENSIONS.includes(cleanExt)) return 'audio';
        if (ARCHIVE_EXTENSIONS.includes(cleanExt)) return 'archive';
      }
    }
    // Fallback to file_name extraction
    const fromName = getFileCategory(file.file_name);
    if (fromName !== 'unknown') {
      return fromName;
    }
    // Last resort: try absolute_path
    if (file.absolute_path) {
      return getFileCategory(file.absolute_path);
    }
    return 'unknown';
  }, [file.file_name, file.file_type, file.absolute_path]);

  // PDF viewer is now lazy-loaded via LazyPdfViewer component
  
  // ELITE: Lazy load syntax highlighter when code is detected
  useEffect(() => {
    if (fileCategory === 'code' && !syntaxHighlighterModule) {
      Promise.all([
        import('react-syntax-highlighter'),
        import('react-syntax-highlighter/dist/esm/styles/prism')
      ]).then(([highlighter, styles]) => {
        setSyntaxHighlighterModule(highlighter);
        setVscDarkPlusStyle(styles.vscDarkPlus);
      });
    }
  }, [fileCategory, syntaxHighlighterModule]);

  // ELITE: Lazy loading - only load file content when viewer is actually visible
  useEffect(() => {
    if (!file) {
      setLoading(false);
      return undefined;
    }

    // File loaded - type detection complete

    setFileCategory(category);
    setLoading(true);
    setError(null);
    setFileContent('');
    setWordContent('');
    setExcelData([]);
    setCsvData('');
    setShouldLoadContent(false); // Reset lazy load flag
    setFileChanged(null); // Reset file change status

    // ELITE: For images and PDFs, load immediately (needed for display)
    // For other types, wait until component is mounted/visible
    if (category === 'image' || category === 'pdf') {
      setShouldLoadContent(true);
      return undefined;
    } else {
      // Small delay to ensure component is mounted before loading heavy content
      const timer = setTimeout(() => setShouldLoadContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [file, category, fileType]);

  // Check file change status on mount and periodically while viewing
  useEffect(() => {
    if (!file?.id) {
      setFileChanged(null);
      return;
    }

    const checkFileChange = async () => {
      try {
        const status = await fileService.checkFileChanged(file.id!);
        setFileChanged(status);
        
        // Check for duplicates if file has hash
        if (caseId && status.file_exists) {
          try {
            const dups = await fileService.findDuplicateFiles(caseId, file.id!);
            setDuplicates(dups);
          } catch (err) {
            // Ignore duplicate check errors
            console.warn('Failed to check duplicates:', err);
          }
        }
      } catch (error) {
        console.warn('Failed to check file change status:', error);
      }
    };

    // Check immediately
    checkFileChange();

    // Poll every 60 seconds while viewing
    const interval = setInterval(checkFileChange, 60000);

    return () => clearInterval(interval);
  }, [file?.id, caseId]);

  // Handle file refresh
  const handleRefresh = useCallback(async () => {
    if (!file?.id) return;

    try {
      // Determine if we should auto-transition status
      const autoTransition = file.status === 'reviewed' || file.status === 'flagged';
      
      await fileService.refreshSingleFile(file.id, autoTransition);
      
      toast({
        title: 'File refreshed',
        description: 'File metadata has been updated.',
        variant: 'success',
      });

      // Notify parent to reload file data
      if (onFileRefresh) {
        onFileRefresh();
      }

      // Re-check file change status
      if (file.id) {
        const status = await fileService.checkFileChanged(file.id);
        setFileChanged(status);
      }
    } catch (error) {
      toast({
        title: 'Failed to refresh file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [file?.id, file?.status, onFileRefresh]);

  // ELITE: Separate effect for loading content (only when shouldLoadContent is true)
  useEffect(() => {
    if (!file || !shouldLoadContent) {
      return undefined;
    }

    const loadFile = async () => {
      try {
        // Loading file via Rust
        
        if (category === 'text' || category === 'code') {
          // ELITE: Use Rust file I/O - much faster than fetch()
          const text = await fileService.readFileText(file.absolute_path);
          setFileContent(text);
        } else if (category === 'office') {
          // ELITE: Load Office documents via Rust, convert base64 to ArrayBuffer
          const base64 = await fileService.readFileBase64(file.absolute_path);
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const arrayBuffer = bytes.buffer;
          
          if (fileType === 'docx' || fileType === 'doc') {
            // ELITE: Lazy load mammoth
            const mammoth = await import('mammoth');
            const result = await mammoth.default.convertToHtml({ arrayBuffer });
            setWordContent(result.value);
            if (result.messages.length > 0) {
              console.warn('Word conversion messages:', result.messages);
            }
          } else if (fileType === 'xlsx' || fileType === 'xls') {
            // ELITE: Lazy load xlsx-js-style
            const XLSX = await import('xlsx-js-style');
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
              throw new Error('No sheets found in Excel file');
            }
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
              throw new Error('Worksheet not found');
            }
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<string | number | null | undefined>>;
            setExcelData(data);
          }
        } else if (category === 'csv') {
          // ELITE: Use Rust file I/O for CSV
          const text = await fileService.readFileText(file.absolute_path);
          setCsvData(text);
        }
        setLoading(false);
      } catch (err) {
        console.error('[IntegratedFileViewer] Error loading file:', err);
        setError(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    // For images, video, audio - no need to preload content
    if (category === 'image' || category === 'video' || category === 'audio' || category === 'archive') {
      setLoading(false);
    } else if (category === 'pdf') {
      // ELITE: Load PDF via Rust, convert base64 to blob
      const loadPdf = async () => {
        try {
          // Loading PDF via Rust
          // console.log('[IntegratedFileViewer] ELITE: Loading PDF via Rust:', file.absolute_path);
          const base64 = await fileService.readFileBase64(file.absolute_path);
          // Convert base64 to blob
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          // PDF loaded via Rust, blob URL created
          // console.log('[IntegratedFileViewer] PDF loaded via Rust, blob URL created');
          setPdfBlobUrl(blobUrl);
          setLoading(false);
        } catch (err) {
          console.error('[IntegratedFileViewer] Error loading PDF:', err);
          setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`);
          setLoading(false);
        }
      };
      loadPdf();
    } else {
      loadFile();
    }
    
    // Cleanup blob URL on unmount or file change
    return () => {
      setPdfBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [file, category, shouldLoadContent, fileType]);

  const handleOpenInSystem = useCallback(async () => {
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(file.absolute_path);
    } catch (err) {
      setError(`Failed to open file: ${err}`);
    }
  }, [file]);

  const imageSrc = useMemo(() => {
    if (category === 'image') {
      return convertFileSrc(file.absolute_path);
    }
    return '';
  }, [category, file.absolute_path]);

  const images = useMemo(() => {
    if (category === 'image' && imageSrc) {
      return [{ src: imageSrc, alt: file.file_name }];
    }
    return [];
  }, [category, imageSrc, file.file_name]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious, hasNext, hasPrevious]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading file...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={handleOpenInSystem}>
            Open
          </Button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (fileCategory) {
      case 'image':
        return (
          <div className="flex items-center justify-center w-full h-full p-4">
            <img
              src={imageSrc}
              alt={file.file_name}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={() => setImageVisible(true)}
            />
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading viewer...</div>}>
              <LazyViewer
                visible={imageVisible}
                onClose={() => setImageVisible(false)}
                images={images}
                activeIndex={0}
                zIndex={10000}
              />
            </Suspense>
          </div>
        );

      case 'pdf':
        if (!pdfBlobUrl) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading PDF...</div>
            </div>
          );
        }
        return (
          <div className="w-full h-full">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="text-sm text-muted-foreground">Loading PDF viewer...</div></div>}>
              <LazyPdfViewer fileUrl={pdfBlobUrl} />
            </Suspense>
          </div>
        );

      case 'text':
        return (
          <div className="w-full h-full overflow-auto p-4">
            {fileType === 'md' || fileType === 'markdown' ? (
              <Suspense fallback={<div className="text-sm text-muted-foreground">Loading markdown viewer...</div>}>
                <LazyTiptapMarkdownViewer content={fileContent} className="w-full h-full" />
              </Suspense>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg">
                {fileContent}
              </pre>
            )}
          </div>
        );

      case 'code':
        if (!syntaxHighlighterModule || !vscDarkPlusStyle) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading syntax highlighter...</div>
            </div>
          );
        }
        const { Prism: SyntaxHighlighter } = syntaxHighlighterModule;
        return (
          <div className="w-full h-full overflow-auto">
            <SyntaxHighlighter
              language={getLanguageFromExtension(fileType)}
              style={vscDarkPlusStyle}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                height: '100%',
              }}
              showLineNumbers
              wrapLines
            >
              {fileContent}
            </SyntaxHighlighter>
          </div>
        );

      case 'office':
        if (fileType === 'docx' || fileType === 'doc') {
          return (
            <div className="w-full h-full overflow-auto p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: wordContent }}
              />
            </div>
          );
        } else if (fileType === 'xlsx' || fileType === 'xls') {
          return (
            <div className="w-full h-full overflow-auto p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-border">
                  <tbody>
                    {excelData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border border-border p-2 text-sm"
                          >
                            {cell !== null && cell !== undefined ? String(cell) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        return (
          <div className="text-center text-muted-foreground p-8">
            <p className="mb-4">Office document viewer for {fileType} files is coming soon!</p>
            <Button onClick={handleOpenInSystem}>
              Open
            </Button>
          </div>
        );

      case 'csv':
        return (
          <div className="w-full h-full overflow-auto p-4">
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading CSV viewer...</div>}>
              <LazyCsvViewer data={csvData} />
            </Suspense>
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <video
              src={convertFileSrc(file.absolute_path)}
              controls
              className="max-w-full max-h-full"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-4">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                <p className="text-lg font-semibold">{file.file_name}</p>
              </div>
              <audio
                src={convertFileSrc(file.absolute_path)}
                controls
                className="w-full"
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          </div>
        );

      case 'archive':
        return (
          <div className="text-center text-muted-foreground p-8">
            <p className="mb-4">Archive viewer for {fileType} files is coming soon!</p>
            <p className="text-sm mb-4">
              For now, click &quot;Open in System&quot; to extract and view archive contents.
            </p>
            <Button onClick={handleOpenInSystem}>
              Open
            </Button>
          </div>
        );

      default:
        // For unknown file types, show open option
        // This handles files without extensions or unsupported formats
        return (
          <div className="text-center text-muted-foreground p-8">
            <div className="mb-4">
              <p className="mb-2">File type not recognized or viewer not available.</p>
              {fileType ? (
                <p className="text-sm">File extension: <code className="bg-muted px-2 py-1 rounded">{fileType}</code></p>
              ) : (
                <p className="text-sm">No file extension detected.</p>
              )}
              <p className="text-xs mt-2 text-muted-foreground">
                Debug: file_type=&quot;{file.file_type}&quot;, file_name=&quot;{file.file_name}&quot;
              </p>
            </div>
            <p className="text-sm mb-4">
              Click below to open this file in your system&apos;s default application.
            </p>
            <Button onClick={handleOpenInSystem} size="lg">
              Open
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background animate-in fade-in-0 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {fileCategory === 'pdf' && <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          {fileCategory === 'image' && <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          {!['pdf', 'image'].includes(fileCategory) && <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <h2 className="text-sm font-semibold truncate">{file.file_name}</h2>
          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
            {fileType.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
            title="Previous file (←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
            title="Next file (→)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />
          
          {fileCategory === 'image' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImageVisible(true)}
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant={metadataPanelOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMetadataPanelOpen(prev => !prev)}
            title="Toggle metadata panel"
          >
            <Hash className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleOpenInSystem}>
            Open in System
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} title="Close (Esc)">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content with optional metadata panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* File Change Warning */}
        {fileChanged && file.id && (
          <>
            <FileChangeWarning
              fileId={file.id}
              {...(file.status ? { fileStatus: file.status } : {})}
              changeStatus={fileChanged}
              onRefresh={handleRefresh}
              onDismiss={() => setFileChanged(null)}
              hasDuplicates={duplicates.length > 0}
              duplicateDialogOpen={duplicateDialogOpen}
              onDuplicateDialogOpenChange={setDuplicateDialogOpen}
            />
            {caseId && (
              <DuplicateFileDialog
                open={duplicateDialogOpen}
                onOpenChange={setDuplicateDialogOpen}
                caseId={caseId}
                fileId={file.id}
                fileName={file.file_name}
                duplicates={duplicates.map((d) => ({
                  file_id: d.file_id,
                  file_name: d.file_name,
                  absolute_path: d.absolute_path,
                  folder_path: d.folder_path,
                  status: d.status,
                }))}
                onFileSelect={(fileId) => {
                  // TODO: Navigate to selected file
                  console.log('Selected duplicate file:', fileId);
                }}
              />
            )}
          </>
        )}
        <div className={metadataPanelOpen ? 'flex-1 overflow-hidden' : 'flex-1 overflow-hidden'}>
          {renderContent()}
        </div>
        {metadataPanelOpen && (
          <div className="w-80 border-l border-border bg-card flex-shrink-0 flex flex-col animate-in slide-in-from-right-2 duration-300">
            <div className="p-3 border-b border-border flex-shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <h3 className="text-sm font-semibold">Metadata</h3>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <MetadataPanel filePath={file.absolute_path} fileType={fileType} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
