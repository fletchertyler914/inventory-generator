import { invoke } from '@tauri-apps/api/core';
import type { FileMetadataExtracted } from '@/types/metadata';

export const metadataService = {
  async extractMetadata(filePath: string): Promise<FileMetadataExtracted> {
    return invoke<FileMetadataExtracted>('extract_file_metadata', {
      filePath, // Tauri converts camelCase to snake_case automatically
    });
  },
};

