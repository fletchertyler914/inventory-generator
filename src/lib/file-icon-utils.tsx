import React from 'react';
import {
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  Music,
  Video,
  FileArchive,
  File,
} from 'lucide-react';

// File type categories - matching IntegratedFileViewer.tsx
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif'];
const PDF_EXTENSIONS = ['pdf'];
const TEXT_EXTENSIONS = ['txt', 'log', 'md', 'markdown', 'readme'];
const CODE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'sass', 'less', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'bash', 'zsh', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'dart', 'sql', 'r', 'm', 'pl', 'lua', 'vim', 'ps1', 'bat', 'cmd'];
const OFFICE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
const CSV_EXTENSIONS = ['csv'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'm4v', '3gp', 'asf', 'rm', 'rmvb', 'vob', 'ts', 'mts', 'm2ts'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'oga', 'aac', 'flac', 'm4a', 'wma', 'opus', '3gp', 'amr', 'ra', 'au'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'];

/**
 * Extract file extension from a file name or file type string
 */
function getFileExtension(fileTypeOrName: string): string {
  if (!fileTypeOrName || fileTypeOrName.trim().length === 0) {
    return '';
  }

  // If it's already just an extension (no dots, short string), return it
  const trimmed = fileTypeOrName.trim().toLowerCase();
  if (!trimmed.includes('.') && trimmed.length <= 5 && /^[a-z0-9]+$/.test(trimmed)) {
    return trimmed;
  }

  // Handle files with multiple dots (e.g., "file.2_Sep 25.pdf" or "file.tar.gz")
  const parts = fileTypeOrName.split('.');
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

/**
 * Get the appropriate icon component for a file type
 * @param fileType - File extension or file name with extension
 * @param className - Optional className to apply to the icon
 * @returns React component with the appropriate icon
 */
export function getFileIcon(
  fileType: string,
  className: string = 'h-4 w-4 flex-shrink-0'
): React.ReactElement {
  const ext = getFileExtension(fileType);

  // PDF files
  if (PDF_EXTENSIONS.includes(ext)) {
    return <FileText className={className} />;
  }

  // Image files
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return <Image className={className} />;
  }

  // CSV files
  if (CSV_EXTENSIONS.includes(ext)) {
    return <FileSpreadsheet className={className} />;
  }

  // Office documents
  if (OFFICE_EXTENSIONS.includes(ext)) {
    // Excel files get spreadsheet icon, others get FileText
    if (['xls', 'xlsx', 'ods'].includes(ext)) {
      return <FileSpreadsheet className={className} />;
    }
    return <FileText className={className} />;
  }

  // Code files
  if (CODE_EXTENSIONS.includes(ext)) {
    return <FileCode className={className} />;
  }

  // Audio files
  if (AUDIO_EXTENSIONS.includes(ext)) {
    return <Music className={className} />;
  }

  // Video files
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return <Video className={className} />;
  }

  // Archive files
  if (ARCHIVE_EXTENSIONS.includes(ext)) {
    return <FileArchive className={className} />;
  }

  // Text files
  if (TEXT_EXTENSIONS.includes(ext)) {
    return <FileText className={className} />;
  }

  // Unknown/fallback
  return <File className={className} />;
}

