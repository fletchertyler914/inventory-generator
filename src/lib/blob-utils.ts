/**
 * ELITE: Shared blob URL utilities for file viewing
 * Provides source-agnostic blob URL creation (works with local files now, cloud sources later)
 * 
 * Performance: Efficient base64-to-blob conversion with proper memory management
 * Scalability: Proper cleanup prevents memory leaks
 * Modularity: Single source of truth for blob URL creation (used by PDFs, images, etc.)
 */

/**
 * Converts base64-encoded string to blob URL
 * ELITE: Handles base64 decoding and blob creation with proper error handling
 * 
 * @param base64 - Base64-encoded file data
 * @param mimeType - MIME type for the blob (e.g., 'image/png', 'application/pdf')
 * @returns Blob URL string
 * @throws Error if base64 decoding fails or blob creation fails
 */
export function createBlobUrlFromBase64(base64: string, mimeType: string): string {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid base64 data: must be a non-empty string');
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error('Invalid MIME type: must be a non-empty string');
  }

  // Decode base64 to binary string
  let binaryString: string;
  try {
    binaryString = atob(base64);
  } catch (decodeError) {
    throw new Error(
      `Failed to decode base64: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
    );
  }

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create blob with specified MIME type
  const blob = new Blob([bytes], { type: mimeType });

  if (blob.size === 0) {
    throw new Error('Blob is empty after creation');
  }

  // Create and return blob URL
  return URL.createObjectURL(blob);
}

/**
 * Determines MIME type from file extension
 * ELITE: Comprehensive MIME type mapping for common file types
 * 
 * @param extension - File extension (without leading dot, case-insensitive)
 * @returns MIME type string
 */
export function getMimeTypeFromExtension(extension: string): string {
  if (!extension) {
    return 'application/octet-stream'; // Default for unknown types
  }

  const ext = extension.toLowerCase().trim().replace(/^\./, ''); // Remove leading dot if present

  // Image MIME types
  const imageMimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  };

  // PDF MIME type
  if (ext === 'pdf') {
    return 'application/pdf';
  }

  // Image MIME types
  if (imageMimeTypes[ext]) {
    return imageMimeTypes[ext];
  }

  // Office document MIME types
  const officeMimeTypes: Record<string, string> = {
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };

  if (officeMimeTypes[ext]) {
    return officeMimeTypes[ext];
  }

  // Default to octet-stream for unknown types
  return 'application/octet-stream';
}

/**
 * Safely revokes a blob URL
 * ELITE: Prevents errors if URL is already revoked or invalid
 * 
 * @param url - Blob URL to revoke
 */
export function revokeBlobUrl(url: string | null | undefined): void {
  if (!url || typeof url !== 'string') {
    return; // Nothing to revoke
  }

  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    // Silently ignore errors (URL might already be revoked)
    // This is safe - revoking an already-revoked URL is a no-op
  }
}

