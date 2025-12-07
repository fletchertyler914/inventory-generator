import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock the duplicate service
vi.mock('@/services/duplicateService', () => ({
  duplicateService: {
    findAllDuplicateGroups: vi.fn(),
  },
}));

// Import after mocks
import { useFileDuplicateCounts } from '../useFileDuplicateCounts';
import { duplicateService } from '@/services/duplicateService';

describe('useFileDuplicateCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty counts when caseId is undefined', () => {
    const { result } = renderHook(() => useFileDuplicateCounts(undefined));

    expect(result.current.duplicateCounts.size).toBe(0);
    expect(result.current.duplicateGroupIds.size).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('should fetch duplicate counts for a case', async () => {
    const mockGroups = [
      {
        group_id: 'hash-1',
        files: [
          { file_id: 'file-1', is_primary: true },
          { file_id: 'file-2', is_primary: false },
          { file_id: 'file-3', is_primary: false },
        ],
        count: 3,
      },
      {
        group_id: 'hash-2',
        files: [
          { file_id: 'file-4', is_primary: true },
          { file_id: 'file-5', is_primary: false },
        ],
        count: 2,
      },
    ];

    vi.mocked(duplicateService.findAllDuplicateGroups).mockResolvedValue(mockGroups as any);

    const { result } = renderHook(() => useFileDuplicateCounts('case-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // file-1: 2 duplicates (file-2, file-3)
    expect(result.current.duplicateCounts.get('file-1')).toBe(2);
    // file-2: 2 duplicates (file-1, file-3)
    expect(result.current.duplicateCounts.get('file-2')).toBe(2);
    // file-3: 2 duplicates (file-1, file-2)
    expect(result.current.duplicateCounts.get('file-3')).toBe(2);
    // file-4: 1 duplicate (file-5)
    expect(result.current.duplicateCounts.get('file-4')).toBe(1);
    // file-5: 1 duplicate (file-4)
    expect(result.current.duplicateCounts.get('file-5')).toBe(1);

    // Verify group IDs
    expect(result.current.duplicateGroupIds.get('file-1')).toBe('hash-1');
    expect(result.current.duplicateGroupIds.get('file-2')).toBe('hash-1');
    expect(result.current.duplicateGroupIds.get('file-4')).toBe('hash-2');
  });

  it('should handle empty duplicate groups', async () => {
    vi.mocked(duplicateService.findAllDuplicateGroups).mockResolvedValue([]);

    const { result } = renderHook(() => useFileDuplicateCounts('case-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.duplicateCounts.size).toBe(0);
    expect(result.current.duplicateGroupIds.size).toBe(0);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(duplicateService.findAllDuplicateGroups).mockRejectedValue(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(() => useFileDuplicateCounts('case-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.duplicateCounts.size).toBe(0);
    expect(result.current.error).toBeTruthy();
  });

  it('should refetch when refetch is called', async () => {
    const mockGroups = [
      {
        group_id: 'hash-1',
        files: [{ file_id: 'file-1', is_primary: true }],
        count: 1,
      },
    ];

    vi.mocked(duplicateService.findAllDuplicateGroups).mockResolvedValue(mockGroups as any);

    const { result } = renderHook(() => useFileDuplicateCounts('case-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(duplicateService.findAllDuplicateGroups).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(duplicateService.findAllDuplicateGroups).toHaveBeenCalledTimes(2);
    });
  });

  it('should cancel fetch when caseId changes', async () => {
    const { rerender } = renderHook(
      ({ caseId }) => useFileDuplicateCounts(caseId),
      { initialProps: { caseId: 'case-1' } }
    );

    rerender({ caseId: 'case-2' });

    // Should not cause errors from cancelled requests
    await waitFor(() => {
      expect(duplicateService.findAllDuplicateGroups).toHaveBeenCalled();
    });
  });
});

