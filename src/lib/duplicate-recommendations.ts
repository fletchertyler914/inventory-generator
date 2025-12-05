import type { DuplicateFile } from '@/services/duplicateService';

export interface Recommendation {
  file_id: string;
  confidence: number; // 0-1, where 1 is highest confidence
  reasons: string[];
}

/**
 * ELITE: Science-based recommendation algorithm to suggest which file to keep
 * 
 * Decision factors (in priority order):
 * 1. File Status: finalized > flagged > reviewed > in_progress > unreviewed
 * 2. Metadata Richness: Files with notes/findings/metadata preferred
 * 3. Path Preference: Files from primary source folders (configurable)
 * 4. Timestamp: Newer files if all else equal
 * 5. File Name: More descriptive names preferred
 */
export function recommendFileToKeep(
  files: DuplicateFile[],
  notesCounts?: Map<string, number>,
  findingsCounts?: Map<string, number>,
  primarySourcePaths?: string[]
): Recommendation | null {
  if (files.length === 0) {
    return null;
  }

  if (files.length === 1) {
    return {
      file_id: files[0].file_id,
      confidence: 1.0,
      reasons: ['Only one file in group'],
    };
  }

  // Status priority scores (higher = better)
  const statusScores: Record<string, number> = {
    finalized: 100,
    flagged: 80,
    reviewed: 60,
    in_progress: 40,
    unreviewed: 20,
  };

  // Score each file
  const scoredFiles = files.map((file) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Status Priority (40% weight)
    const statusScore = statusScores[file.status] || 0;
    score += statusScore * 0.4;
    if (statusScore > 0) {
      reasons.push(`Status: ${file.status} (${statusScore} points)`);
    }

    // 2. Metadata Richness (30% weight)
    const notesCount = notesCounts?.get(file.file_id) || 0;
    const findingsCount = findingsCounts?.get(file.file_id) || 0;
    const metadataScore = Math.min(100, (notesCount * 10) + (findingsCount * 15));
    score += metadataScore * 0.3;
    if (notesCount > 0 || findingsCount > 0) {
      reasons.push(`Metadata: ${notesCount} notes, ${findingsCount} findings`);
    }

    // 3. Path Preference (15% weight)
    if (primarySourcePaths && file.source_directory) {
      const isPrimaryPath = primarySourcePaths.some((path) =>
        file.source_directory?.includes(path) || file.absolute_path.includes(path)
      );
      if (isPrimaryPath) {
        score += 100 * 0.15;
        reasons.push('From primary source folder');
      }
    }

    // 4. Timestamp (10% weight) - newer files preferred
    const ageScore = Math.min(100, Math.max(0, 100 - (Date.now() / 1000 - file.modified_at) / 86400));
    score += ageScore * 0.1;
    if (ageScore > 50) {
      reasons.push('Recently modified');
    }

    // 5. File Name (5% weight) - more descriptive names preferred
    const nameScore = Math.min(100, file.file_name.length * 2);
    score += nameScore * 0.05;
    if (nameScore > 50) {
      reasons.push('Descriptive filename');
    }

    // Bonus: Primary file marker
    if (file.is_primary) {
      score += 20;
      reasons.push('Currently marked as primary');
    }

    return {
      file,
      score,
      reasons,
    };
  });

  // Find file with highest score
  const best = scoredFiles.reduce((prev, current) =>
    current.score > prev.score ? current : prev
  );

  // Calculate confidence based on score difference
  const scores = scoredFiles.map((s) => s.score).sort((a, b) => b - a);
  const scoreDiff = scores.length > 1 ? scores[0] - scores[1] : scores[0];
  const confidence = Math.min(1.0, Math.max(0.5, scoreDiff / 50));

  return {
    file_id: best.file.file_id,
    confidence,
    reasons: best.reasons,
  };
}

/**
 * Get notes count for files (helper function)
 * Uses noteService to get counts for all files in case
 */
export async function getNotesCounts(
  fileIds: string[],
  caseId: string
): Promise<Map<string, number>> {
  try {
    const { noteService } = await import('@/services/noteService');
    const counts = await noteService.getFileNoteCounts(caseId);
    const map = new Map<string, number>();
    for (const fileId of fileIds) {
      map.set(fileId, counts[fileId] || 0);
    }
    return map;
  } catch (error) {
    console.error('Failed to get note counts:', error);
    return new Map();
  }
}

/**
 * Get findings count for files (helper function)
 * Queries findings that have file IDs in linked_files JSON
 */
export async function getFindingsCounts(
  fileIds: string[],
  caseId: string
): Promise<Map<string, number>> {
  try {
    const { findingService } = await import('@/services/findingService');
    const findings = await findingService.listFindings(caseId);
    const map = new Map<string, number>();
    
    // Initialize all file IDs with 0
    for (const fileId of fileIds) {
      map.set(fileId, 0);
    }
    
    // Count findings linked to each file
    for (const finding of findings) {
      if (finding.linked_files) {
        try {
          const linkedFiles = JSON.parse(finding.linked_files) as string[];
          for (const fileId of linkedFiles) {
            if (map.has(fileId)) {
              map.set(fileId, (map.get(fileId) || 0) + 1);
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    }
    
    return map;
  } catch (error) {
    console.error('Failed to get finding counts:', error);
    return new Map();
  }
}

