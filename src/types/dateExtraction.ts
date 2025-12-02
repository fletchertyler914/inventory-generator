/**
 * Type definitions for date extraction
 */

export interface ExtractedDate {
  date: number; // Unix timestamp
  date_string: string; // Original date string found
  context: string; // Context where date was found
  confidence: number; // Confidence score 0.0-1.0
}

export interface DateExtractionResult {
  file_path: string;
  dates: ExtractedDate[];
  primary_date?: number; // Most likely document date
}

