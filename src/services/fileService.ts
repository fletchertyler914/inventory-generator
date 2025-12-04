import { safeInvoke } from '@/lib/tauri-utils';
import { isTauri } from '@/lib/tauri-utils';
import { cachedInvoke, clearCache } from '@/lib/request-cache';
import type { File } from '@/types/file';
import type { InventoryItem } from '@/types/inventory';

export interface IngestResult {
  files_inserted: number;
  files_updated: number;
  files_skipped: number;
  total_files: number;
  errors?: string[] | null;
}

export interface FileChangeStatus {
  changed: boolean;
  file_exists: boolean;
  current_size: number | null;
  current_modified: number | null;
  stored_size: number;
  stored_modified: number;
  hash_changed: boolean | null;
}

export interface DuplicateFile {
  file_id: string;
  file_name: string;
  absolute_path: string;
  folder_path: string;
  status: string;
}

export interface RefreshResult {
  files_refreshed: number;
  files_failed: number;
  errors?: string[] | null;
}

export const fileService = {
  async openFile(path: string): Promise<void> {
    if (isTauri()) {
      const { openPath } = await import('@tauri-apps/plugin-opener');
      return openPath(path);
    } else {
      // Browser mode: Can't open files, but show helpful message
      throw new Error('File opening requires Tauri app. Use "pnpm tauri dev" for full functionality.');
    }
  },

  async openFileViaCommand(path: string): Promise<void> {
    return safeInvoke('open_file', { path });
  },

  /**
   * Ingest files from a folder into a case
   * Stores files in database with hashing, deduplication, and incremental sync
   * Clears cache after ingestion to ensure fresh data
   */
  async ingestFilesToCase(
    caseId: string,
    folderPath: string,
    incremental?: boolean
  ): Promise<IngestResult> {
    const result = await safeInvoke<IngestResult>('ingest_files_to_case', {
      caseId,
      folderPath,
      incremental: incremental ?? true,
    });
    // Clear cache for this case's files
    clearCache('load_case_files_with_inventory');
    clearCache('get_case_file_count');
    return result;
  },

  /**
   * Load all files for a case from database
   * Fast: < 100ms for thousands of files
   */
  async loadCaseFiles(caseId: string): Promise<File[]> {
    return safeInvoke<File[]>('load_case_files', { caseId });
  },

  /**
   * Load files with inventory metadata for UI display
   * Converts File + inventory_data to InventoryItem for compatibility
   * ELITE: Optimized for large datasets (10k+ files)
   * 
   * CACHING STRATEGY:
   * - Cached for 30 seconds to reduce redundant database queries
   * - Database is source of truth (files must be synced/ingested first)
   * - Cache is cleared automatically after sync/ingest operations
   * - Use syncCaseAllSources() to refresh from filesystem/cloud
   * - Short TTL ensures data freshness while reducing load
   */
  async loadCaseFilesWithInventory(caseId: string, forceRefresh?: boolean): Promise<InventoryItem[]> {
    if (forceRefresh) {
      clearCache('load_case_files_with_inventory');
    }
    return cachedInvoke<InventoryItem[]>('load_case_files_with_inventory', { caseId }, 30 * 1000);
  },

  /**
   * Get total file count for a case (fast count query)
   * ELITE: Optimized count query for large datasets
   * Cached for 30 seconds (same as file list for consistency)
   */
  async getCaseFileCount(caseId: string, forceRefresh?: boolean): Promise<number> {
    if (forceRefresh) {
      clearCache('get_case_file_count');
    }
    return cachedInvoke<number>('get_case_file_count', { caseId }, 30 * 1000);
  },

  /**
   * Add a source folder/file to a case
   * This allows cases to have multiple source folders/files
   */
  async addCaseSource(caseId: string, sourcePath: string): Promise<void> {
    return safeInvoke('add_case_source', { caseId, sourcePath });
  },

  /**
   * List all source folders/files for a case
   * Cached for 5 minutes (sources rarely change)
   */
  async listCaseSources(caseId: string): Promise<string[]> {
    return cachedInvoke<string[]>('list_case_sources', { caseId }, 5 * 60 * 1000);
  },

  /**
   * Sync all source folders/files for a case
   * This syncs ALL sources, not just the original folder
   * Clears cache after sync
   */
  async syncCaseAllSources(caseId: string, incremental?: boolean): Promise<IngestResult> {
    const result = await safeInvoke<IngestResult>('sync_case_all_sources', {
      caseId,
      incremental: incremental ?? true,
    });
    // Clear cache for this case's files
    clearCache('load_case_files_with_inventory');
    clearCache('get_case_file_count');
    return result;
  },

  /**
   * ELITE: Read file as base64-encoded string (for binary files like PDF, images, Office docs)
   * Uses native Rust file I/O - much faster than fetch()
   */
  async readFileBase64(path: string): Promise<string> {
    return safeInvoke<string>('read_file_base64', { path });
  },

  /**
   * ELITE: Read file as text (for text/code files)
   * Uses native Rust file I/O - much faster than fetch()
   */
  async readFileText(path: string): Promise<string> {
    return safeInvoke<string>('read_file_text', { path });
  },

  /**
   * Check if a file has changed since last sync
   * Compares current file metadata with stored values
   */
  async checkFileChanged(fileId: string): Promise<FileChangeStatus> {
    return safeInvoke<FileChangeStatus>('check_file_changed', { fileId });
  },

  /**
   * Refresh/re-ingest a single file
   * Updates file metadata and optionally transitions status
   * Clears cache to ensure fresh data
   */
  async refreshSingleFile(
    fileId: string,
    autoTransitionStatus: boolean
  ): Promise<void> {
    await safeInvoke('refresh_single_file', {
      fileId,
      autoTransitionStatus,
    });
    // Clear cache for file lists (file count may have changed)
    clearCache('load_case_files_with_inventory');
    clearCache('get_case_file_count');
  },

  /**
   * Refresh/re-ingest multiple files (bulk)
   * Updates file metadata and optionally transitions status
   * Clears cache to ensure fresh data
   */
  async refreshFilesBulk(
    fileIds: string[],
    autoTransitionStatus: boolean
  ): Promise<RefreshResult> {
    const result = await safeInvoke<RefreshResult>('refresh_files_bulk', {
      fileIds,
      autoTransitionStatus,
    });
    // Clear cache for file lists
    clearCache('load_case_files_with_inventory');
    clearCache('get_case_file_count');
    return result;
  },

  /**
   * Find duplicate files (same hash, different path)
   * Returns list of files with the same hash in the case
   */
  async findDuplicateFiles(
    caseId: string,
    fileId: string
  ): Promise<DuplicateFile[]> {
    return safeInvoke<DuplicateFile[]>('find_duplicate_files', {
      caseId,
      fileId,
    });
  },

  /**
   * Update file status in the database
   */
  async updateFileStatus(fileId: string, status: string): Promise<void> {
    return safeInvoke('update_file_status', { fileId, status });
  },

  /**
   * Remove a file from a case
   * Deletes the file record and all related records (notes, findings, timeline events, metadata)
   * Clears cache after removal
   */
  async removeFileFromCase(fileId: string, caseId: string): Promise<void> {
    await safeInvoke('remove_file_from_case', { fileId, caseId });
    // Clear cache for this case's files
    clearCache('load_case_files_with_inventory');
    clearCache('get_case_file_count');
  },
};

