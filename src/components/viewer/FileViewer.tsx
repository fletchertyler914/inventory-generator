import { useState, useEffect, useMemo } from 'react';
import { X, FileText, Image as ImageIcon, File, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { convertFileSrc } from '@tauri-apps/api/core';
import { fileService } from '@/services/fileService';
import Viewer from 'react-viewer';
import { Worker, Viewer as PDFViewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { TiptapMarkdownViewer } from './TiptapMarkdownViewer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CsvViewer } from './CsvViewer';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx-js-style';

interface FileViewerProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
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
  if (!ext) return 'unknown';
  
  const lowerExt = ext.toLowerCase();
  if (IMAGE_EXTENSIONS.includes(lowerExt)) return 'image';
  if (PDF_EXTENSIONS.includes(lowerExt)) return 'pdf';
  if (TEXT_EXTENSIONS.includes(lowerExt)) return 'text';
  if (CODE_EXTENSIONS.includes(lowerExt)) return 'code';
  if (OFFICE_EXTENSIONS.includes(lowerExt)) return 'office';
  if (CSV_EXTENSIONS.includes(lowerExt)) return 'csv';
  if (VIDEO_EXTENSIONS.includes(lowerExt)) return 'video';
  if (AUDIO_EXTENSIONS.includes(lowerExt)) return 'audio';
  if (ARCHIVE_EXTENSIONS.includes(lowerExt)) return 'archive';
  
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

export function FileViewer({ filePath, fileName, onClose }: FileViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<'image' | 'pdf' | 'text' | 'code' | 'office' | 'csv' | 'video' | 'audio' | 'archive' | 'unknown'>('unknown');
  const [fileContent, setFileContent] = useState<string>('');
  const [imageVisible, setImageVisible] = useState(false);
  const [wordContent, setWordContent] = useState<string>('');
  const [excelData, setExcelData] = useState<Array<Array<string | number | null | undefined>>>([]);
  const [csvData, setCsvData] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const fileType = useMemo(() => getFileType(fileName), [fileName]);
  const category = useMemo(() => getFileCategory(fileName), [fileName]);

  // PDF viewer plugin
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    setFileCategory(category);
    setLoading(true);
    setError(null);
    setFileContent('');
    setWordContent('');
    setExcelData([]);
    setCsvData('');

    const loadFile = async () => {
      try {
        if (category === 'text' || category === 'code') {
          // ELITE: Use Rust file I/O - much faster than fetch()
          const text = await fileService.readFileText(filePath);
          setFileContent(text);
        } else if (category === 'office') {
          // ELITE: Load Office documents via Rust, convert base64 to ArrayBuffer
          const base64 = await fileService.readFileBase64(filePath);
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const arrayBuffer = bytes.buffer;
          
          if (fileType === 'docx' || fileType === 'doc') {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setWordContent(result.value);
            if (result.messages.length > 0) {
              console.warn('Word conversion messages:', result.messages);
            }
          } else if (fileType === 'xlsx' || fileType === 'xls') {
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
          const text = await fileService.readFileText(filePath);
          setCsvData(text);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading file:', err);
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
          const base64 = await fileService.readFileBase64(filePath);
          // Convert base64 to blob
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
          setLoading(false);
        } catch (err) {
          console.error('Error loading PDF:', err);
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
  }, [filePath, fileName, category, fileType]);

  const handleOpenInSystem = async () => {
    try {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(filePath);
    } catch (err) {
      setError(`Failed to open file: ${err}`);
    }
  };

  const imageSrc = useMemo(() => {
    if (category === 'image') {
      return convertFileSrc(filePath);
    }
    return '';
  }, [category, filePath]);

  const images = useMemo(() => {
    if (category === 'image' && imageSrc) {
      return [{ src: imageSrc, alt: fileName }];
    }
    return [];
  }, [category, imageSrc, fileName]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Loading file...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg max-w-md">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Error</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            <Button onClick={handleOpenInSystem}>
              Open
            </Button>
            </div>
          </div>
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
              alt={fileName}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={() => setImageVisible(true)}
            />
            <Viewer
              visible={imageVisible}
              onClose={() => setImageVisible(false)}
              images={images}
              activeIndex={0}
              zIndex={10000}
            />
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
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <PDFViewer
                fileUrl={pdfBlobUrl}
                plugins={[defaultLayoutPluginInstance]}
              />
            </Worker>
          </div>
        );

      case 'text':
        return (
          <div className="w-full h-full overflow-auto p-4">
            {fileType === 'md' || fileType === 'markdown' ? (
              <TiptapMarkdownViewer content={fileContent} className="w-full h-full" />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg">
                {fileContent}
              </pre>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="w-full h-full overflow-auto">
            <SyntaxHighlighter
              language={getLanguageFromExtension(fileType)}
              style={vscDarkPlus}
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
            <CsvViewer data={csvData} />
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full flex items-center justify-center p-4">
            <video
              src={convertFileSrc(filePath)}
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
                <p className="text-lg font-semibold">{fileName}</p>
              </div>
              <audio
                src={convertFileSrc(filePath)}
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
        // For unknown file types, try to open in system app by default
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {fileCategory === 'pdf' && <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
            {fileCategory === 'image' && <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
            {!['pdf', 'image'].includes(fileCategory) && <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
            <h2 className="text-lg font-semibold truncate">{fileName}</h2>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              {fileType.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
            <Button variant="outline" size="sm" onClick={handleOpenInSystem}>
              Open in System
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} title="Close (Esc)">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
