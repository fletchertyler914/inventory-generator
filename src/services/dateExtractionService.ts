import { invoke } from '@tauri-apps/api/core';
import type { DateExtractionResult } from '@/types/dateExtraction';

export const dateExtractionService = {
  async extractDates(filePath: string): Promise<DateExtractionResult> {
    return invoke<DateExtractionResult>('extract_dates_from_file', {
      filePath, // Tauri converts camelCase to snake_case automatically
    });
  },
};

