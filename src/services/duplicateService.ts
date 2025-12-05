import { safeInvoke } from '@/lib/tauri-utils';
import { cachedInvoke, clearCache } from '@/lib/request-cache';

export interface DuplicateGroup {
  group_id: string;
  files: DuplicateFile[];
  count: number;
}

export interface DuplicateFile {
  file_id: string;
  file_name: string;
  absolute_path: string;
  folder_path: string;
  status: string;
  file_size: number;
  created_at: number;
  modified_at: number;
  source_directory?: string | null;
  is_primary: boolean;
}

export interface DuplicateStats {
  total_groups: number;
  total_duplicates: number;
  total_size_savings: number; // Total bytes that could be saved if all duplicates removed
}

export const duplicateService = {
  /**
   * Find all duplicate groups in a case (local files only)
   * Cached for 30 seconds to reduce redundant database queries
   */
  async findAllDuplicateGroups(caseId: string, forceRefresh?: boolean): Promise<DuplicateGroup[]> {
    if (forceRefresh) {
      clearCache('find_all_duplicate_groups');
    }
    return cachedInvoke<DuplicateGroup[]>('find_all_duplicate_groups', { caseId }, 30 * 1000);
  },

  /**
   * Get duplicate group for a specific file
   * Cached for 30 seconds
   */
  async getDuplicateGroup(caseId: string, fileId: string, forceRefresh?: boolean): Promise<DuplicateGroup | null> {
    if (forceRefresh) {
      clearCache('get_duplicate_group');
    }
    return cachedInvoke<DuplicateGroup | null>('get_duplicate_group', { caseId, fileId }, 30 * 1000);
  },

  /**
   * Mark a file as primary in a duplicate group
   * Clears cache after mutation
   */
  async markAsPrimary(fileId: string, groupId: string): Promise<void> {
    await safeInvoke('mark_duplicate_primary', { fileId, groupId });
    // Clear cache for duplicate groups
    clearCache('find_all_duplicate_groups');
    clearCache('get_duplicate_group');
  },

  /**
   * Remove duplicate from case (soft delete)
   * Optionally merge metadata to target file before deletion
   * Clears cache after mutation
   */
  async removeDuplicate(
    fileId: string,
    caseId: string,
    mergeToFileId?: string
  ): Promise<void> {
    // If merge requested, merge metadata first
    if (mergeToFileId) {
      await safeInvoke('merge_duplicate_metadata', {
        sourceFileId: fileId,
        targetFileId: mergeToFileId,
        caseId,
      });
    }

    // Remove duplicate group entry
    // Note: We use remove_file_from_case which handles soft delete
    // But we also need to remove from duplicate_groups
    // For now, we'll rely on the soft delete and the duplicate detection will skip deleted files
    await safeInvoke('remove_file_from_case', { fileId, caseId });
    
    // Clear cache
    clearCache('find_all_duplicate_groups');
    clearCache('get_duplicate_group');
    clearCache('load_case_files_with_inventory');
    clearCache('get_case_file_count');
  },

  /**
   * Merge metadata from source file to target file
   * Clears cache after mutation
   */
  async mergeDuplicateMetadata(sourceFileId: string, targetFileId: string, caseId: string): Promise<void> {
    await safeInvoke('merge_duplicate_metadata', {
      sourceFileId,
      targetFileId,
      caseId,
    });
    // Clear cache
    clearCache('find_all_duplicate_groups');
    clearCache('get_duplicate_group');
  },

  /**
   * Get duplicate statistics for a case
   * Calculates total groups, duplicates, and potential space savings
   */
  async getDuplicateStats(caseId: string): Promise<DuplicateStats> {
    const groups = await this.findAllDuplicateGroups(caseId);
    
    let total_duplicates = 0;
    let total_size_savings = 0;
    
    for (const group of groups) {
      if (group.count > 1) {
        // Count duplicates (files beyond the first one)
        total_duplicates += group.count - 1;
        
        // Calculate size savings (all duplicates except primary)
        const primaryFile = group.files.find(f => f.is_primary) || group.files[0];
        for (const file of group.files) {
          if (file.file_id !== primaryFile.file_id) {
            total_size_savings += file.file_size;
          }
        }
      }
    }
    
    return {
      total_groups: groups.length,
      total_duplicates,
      total_size_savings,
    };
  },
};

