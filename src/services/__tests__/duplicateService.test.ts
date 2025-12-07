import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateService, DuplicateGroup } from '../duplicateService';
import { safeInvoke } from '@/lib/tauri-utils';
import { cachedInvoke, clearCache } from '@/lib/request-cache';

// Mock Tauri utils
vi.mock('@/lib/tauri-utils', async () => {
  const actual = await vi.importActual('@/lib/tauri-utils');
  return {
    ...actual,
    safeInvoke: vi.fn(),
  };
});

vi.mock('@/lib/request-cache', async () => {
  const actual = await vi.importActual('@/lib/request-cache');
  return {
    ...actual,
    cachedInvoke: vi.fn(),
    clearCache: vi.fn(),
  };
});

describe('duplicateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAllDuplicateGroups', () => {
    it('should fetch duplicate groups with caching', async () => {
      const mockGroups = [
        {
          group_id: 'hash-1',
          files: [
            { file_id: 'file-1', is_primary: true },
            { file_id: 'file-2', is_primary: false },
          ],
          count: 2,
        },
      ];

      vi.mocked(cachedInvoke).mockResolvedValue(mockGroups);

      const result = await duplicateService.findAllDuplicateGroups('case-1');

      expect(cachedInvoke).toHaveBeenCalledWith(
        'find_all_duplicate_groups',
        { caseId: 'case-1' },
        30000 // 30 second cache
      );
      expect(result).toEqual(mockGroups);
    });

    it('should force refresh when forceRefresh is true', async () => {
      const mockGroups: DuplicateGroup[] = [];

      vi.mocked(clearCache).mockReturnValue(undefined);
      vi.mocked(cachedInvoke).mockResolvedValue(mockGroups);

      await duplicateService.findAllDuplicateGroups('case-1', true);

      expect(clearCache).toHaveBeenCalledWith('find_all_duplicate_groups');
    });
  });

  describe('getDuplicateGroup', () => {
    it('should fetch duplicate group for a file', async () => {
      const mockGroup = {
        group_id: 'hash-1',
        files: [
          { file_id: 'file-1', is_primary: true },
          { file_id: 'file-2', is_primary: false },
        ],
        count: 2,
      };

      vi.mocked(cachedInvoke).mockResolvedValue(mockGroup);

      const result = await duplicateService.getDuplicateGroup('case-1', 'file-1');

      expect(cachedInvoke).toHaveBeenCalledWith(
        'get_duplicate_group',
        { caseId: 'case-1', fileId: 'file-1' },
        30000
      );
      expect(result).toEqual(mockGroup);
    });
  });

  describe('markAsPrimary', () => {
    it('should mark file as primary and clear cache', async () => {
      vi.mocked(safeInvoke).mockResolvedValue(undefined);

      await duplicateService.markAsPrimary('file-1', 'hash-1');

      expect(safeInvoke).toHaveBeenCalledWith('mark_duplicate_primary', {
        fileId: 'file-1',
        groupId: 'hash-1',
      });
      expect(clearCache).toHaveBeenCalledWith('find_all_duplicate_groups');
      expect(clearCache).toHaveBeenCalledWith('get_duplicate_group');
    });
  });

  describe('removeDuplicate', () => {
    it('should remove duplicate without merging', async () => {
      vi.mocked(safeInvoke).mockResolvedValue(undefined);

      await duplicateService.removeDuplicate('file-1', 'case-1');

      expect(safeInvoke).toHaveBeenCalledWith('remove_file_from_case', {
        fileId: 'file-1',
        caseId: 'case-1',
      });
      expect(clearCache).toHaveBeenCalledWith('find_all_duplicate_groups');
      expect(clearCache).toHaveBeenCalledWith('get_duplicate_group');
    });

    it('should merge metadata before removing', async () => {
      vi.mocked(safeInvoke).mockResolvedValue(undefined);

      await duplicateService.removeDuplicate('file-1', 'case-1', 'file-2');

      expect(safeInvoke).toHaveBeenCalledWith('merge_duplicate_metadata', {
        sourceFileId: 'file-1',
        targetFileId: 'file-2',
        caseId: 'case-1',
      });
      expect(safeInvoke).toHaveBeenCalledWith('remove_file_from_case', {
        fileId: 'file-1',
        caseId: 'case-1',
      });
    });
  });

  describe('getDuplicateStats', () => {
    it('should calculate duplicate statistics', async () => {
      const mockGroups = [
        {
          group_id: 'hash-1',
          files: [
            { file_id: 'file-1', is_primary: true, file_size: 1000 },
            { file_id: 'file-2', is_primary: false, file_size: 1000 },
            { file_id: 'file-3', is_primary: false, file_size: 1000 },
          ],
          count: 3,
        },
        {
          group_id: 'hash-2',
          files: [
            { file_id: 'file-4', is_primary: true, file_size: 2000 },
            { file_id: 'file-5', is_primary: false, file_size: 2000 },
          ],
          count: 2,
        },
      ];

      vi.mocked(cachedInvoke).mockResolvedValue(mockGroups as any);

      const stats = await duplicateService.getDuplicateStats('case-1');

      expect(stats.total_groups).toBe(2);
      expect(stats.total_duplicates).toBe(3); // 2 from hash-1, 1 from hash-2
      // Size savings: file-2 (1000) + file-3 (1000) + file-5 (2000) = 4000
      expect(stats.total_size_savings).toBe(4000);
    });

    it('should handle groups without primary file', async () => {
      const mockGroups = [
        {
          group_id: 'hash-1',
          files: [
            { file_id: 'file-1', is_primary: false, file_size: 1000 },
            { file_id: 'file-2', is_primary: false, file_size: 1000 },
          ],
          count: 2,
        },
      ];

      vi.mocked(cachedInvoke).mockResolvedValue(mockGroups as any);

      const stats = await duplicateService.getDuplicateStats('case-1');

      // Should use first file as primary if no primary exists
      expect(stats.total_groups).toBe(1);
      expect(stats.total_duplicates).toBe(1);
    });
  });
});

