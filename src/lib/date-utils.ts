/**
 * Date validation and formatting utilities for MM/DD/YYYY format
 */

/**
 * Validates a date string in MM/DD/YYYY format
 * @param dateStr - Date string to validate (e.g., "11/20/2025")
 * @returns true if valid, false otherwise
 */
export function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = dateStr.trim();
  
  // Check format: MM/DD/YYYY or M/D/YYYY (flexible with single digits)
  const pattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = trimmed.match(pattern);
  
  if (!match) {
    return false;
  }

  const [, monthStr, dayStr, yearStr] = match;
  if (!monthStr || !dayStr || !yearStr) {
    return false;
  }
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

  // Validate month
  if (month < 1 || month > 12) {
    return false;
  }

  // Validate year (reasonable range)
  if (year < 1900 || year > 2100) {
    return false;
  }

  // Validate day
  if (day < 1 || day > 31) {
    return false;
  }

  // Check if date is valid (handles invalid dates like 31-Feb)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return true;
}

/**
 * Formats a Date object to MM/DD/YYYY format
 * @param date - Date object to format
 * @returns Formatted date string (e.g., "11/20/2025")
 */
export function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Parses a date string in MM/DD/YYYY format to a Date object
 * @param dateStr - Date string to parse (e.g., "11/20/2025")
 * @returns Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  if (!isValidDateFormat(dateStr)) {
    return null;
  }

  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  
  if (!match) {
    return null;
  }

  const [, monthStr, dayStr, yearStr] = match;
  if (!monthStr || !dayStr || !yearStr) {
    return null;
  }
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

  return new Date(year, month - 1, day);
}

/**
 * Gets error message for invalid date format
 * @param dateStr - Date string to validate
 * @returns Error message or empty string if valid
 */
export function getDateErrorMessage(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) {
    return '';
  }

  if (!isValidDateFormat(dateStr)) {
    return 'Invalid date format. Use MM/DD/YYYY (e.g., 11/20/2025)';
  }

  return '';
}
