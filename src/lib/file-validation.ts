/**
 * ELITE: Frontend filename validation utilities
 * Matches backend validation rules for consistent validation across stack
 * 
 * Performance: Fast client-side validation before API calls
 * Security: Prevents XSS, validates OS-specific rules
 * Modularity: Single source of truth for frontend filename rules
 */

/**
 * Reserved filenames on Windows (case-insensitive)
 */
const RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
];

/**
 * Invalid characters for filenames (Windows + Unix)
 */
const INVALID_CHARS = ['<', '>', ':', '"', '|', '?', '*', '\\', '/', '\0'];

/**
 * Validation result
 */
export interface FilenameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate filename according to OS rules
 * Matches backend validation in file_operations::validate_filename
 * 
 * @param filename - Filename to validate
 * @returns Validation result with error message if invalid
 */
export function validateFilename(filename: string): FilenameValidationResult {
  if (!filename || filename.trim().length === 0) {
    return {
      valid: false,
      error: 'Filename cannot be empty',
    };
  }

  // Check for reserved names (Windows)
  const upperName = filename.toUpperCase().trim();
  if (RESERVED_NAMES.includes(upperName)) {
    return {
      valid: false,
      error: `'${filename}' is a reserved filename on Windows`,
    };
  }

  // Check for invalid characters
  for (const char of INVALID_CHARS) {
    if (filename.includes(char)) {
      return {
        valid: false,
        error: `Filename cannot contain '${char}'`,
      };
    }
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(filename)) {
    return {
      valid: false,
      error: 'Filename cannot contain control characters',
    };
  }

  // Check for leading/trailing spaces
  if (filename.startsWith(' ') || filename.endsWith(' ')) {
    return {
      valid: false,
      error: 'Filename cannot start or end with a space',
    };
  }

  // Check for reserved names
  if (filename === '.' || filename === '..') {
    return {
      valid: false,
      error: "Filename cannot be '.' or '..'",
    };
  }

  // Check length
  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename cannot exceed 255 characters',
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for display (prevent XSS)
 * Removes invalid characters and trims
 * 
 * @param filename - Filename to sanitize
 * @returns Sanitized filename safe for display
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Remove invalid characters
  let sanitized = filename;
  for (const char of INVALID_CHARS) {
    sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), '');
  }
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim spaces
  sanitized = sanitized.trim();
  
  // Remove leading/trailing dots (except for .hidden files)
  if (sanitized === '.' || sanitized === '..') {
    sanitized = sanitized.replace(/^\.+/, '');
  }
  
  return sanitized;
}

/**
 * Extract filename from full path
 * 
 * @param path - Full file path
 * @returns Filename portion
 */
export function extractFilename(path: string): string {
  if (!path) return '';
  
  // Handle both Unix and Windows paths
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}

/**
 * Extract directory from full path
 * 
 * @param path - Full file path
 * @returns Directory portion
 */
export function extractDirectory(path: string): string {
  if (!path) return '';
  
  const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSeparator === -1) return '';
  
  return path.substring(0, lastSeparator);
}

/**
 * Extract file extension from filename
 * 
 * @param filename - Filename (with or without path)
 * @returns Extension including the dot (e.g., ".pdf") or empty string if no extension
 */
export function extractExtension(filename: string): string {
  if (!filename) return '';
  
  // Extract just the filename if a path is provided
  const name = extractFilename(filename);
  
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || lastDot === name.length - 1) {
    // No extension, or dot at start (hidden file), or dot at end
    return '';
  }
  
  return name.substring(lastDot);
}

/**
 * Get filename without extension
 * 
 * @param filename - Filename (with or without path)
 * @returns Filename without extension
 */
export function getFilenameWithoutExtension(filename: string): string {
  if (!filename) return '';
  
  const name = extractFilename(filename);
  const ext = extractExtension(name);
  
  if (!ext) return name;
  
  return name.substring(0, name.length - ext.length);
}

