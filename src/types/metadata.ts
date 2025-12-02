/**
 * Type definitions for file metadata extraction
 */

export interface FileMetadataExtracted {
  file_path: string;
  file_size: number;
  created_at: number;
  modified_at: number;
  md5_hash?: string;
  sha256_hash?: string;
  file_type: string;
  mime_type?: string;
  pdf_info?: PdfMetadata;
  image_info?: ImageMetadata;
  email_info?: EmailMetadata;
  media_info?: MediaMetadata;
  metadata_json?: string;
}

export interface PdfMetadata {
  page_count?: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creation_date?: string;
  modification_date?: string;
  encrypted?: boolean;
  permissions?: string;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  color_space?: string;
  exif?: string; // JSON string
  has_transparency?: boolean;
}

export interface EmailMetadata {
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  date?: string;
  message_id?: string;
  headers?: string; // JSON string
  attachment_count?: number;
}

export interface MediaMetadata {
  duration?: number; // seconds
  codec?: string;
  bitrate?: number;
  sample_rate?: number;
  channels?: number;
}

