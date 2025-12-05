import { useState, useEffect, useCallback } from 'react';
import { Copy, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { PanelContainer } from '../panel/PanelContainer';
import { PanelHeader } from '../panel/PanelHeader';
import { PanelContent } from '../panel/PanelContent';
import { PanelEmptyState } from '../panel/PanelEmptyState';
import { PanelCard } from '../panel/PanelCard';
import { duplicateService, type DuplicateGroup } from '@/services/duplicateService';
import { toast } from '@/hooks/useToast';
import { DuplicateGroupView } from './DuplicateGroupView';
import { formatBytes } from '@/lib/inventory-utils';

interface DuplicateManagementPanelProps {
  caseId: string;
  onClose?: () => void;
}

export function DuplicateManagementPanel({ caseId, onClose }: DuplicateManagementPanelProps) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total_groups: number; total_duplicates: number; total_size_savings: number } | null>(null);

  // Load duplicate groups
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const [loadedGroups, loadedStats] = await Promise.all([
        duplicateService.findAllDuplicateGroups(caseId, true),
        duplicateService.getDuplicateStats(caseId),
      ]);
      setGroups(loadedGroups);
      setStats(loadedStats);
    } catch (error) {
      console.error('Failed to load duplicate groups:', error);
      toast({
        title: 'Failed to load duplicates',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleGroupSelect = useCallback((groupId: string) => {
    setSelectedGroupId(groupId === selectedGroupId ? null : groupId);
  }, [selectedGroupId]);

  const handleGroupResolved = useCallback(() => {
    loadGroups();
    setSelectedGroupId(null);
  }, [loadGroups]);

  if (loading) {
    return (
      <PanelContainer>
        <PanelHeader title="Duplicates" onClose={onClose} />
        <PanelContent>
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading duplicates...</div>
          </div>
        </PanelContent>
      </PanelContainer>
    );
  }

  if (groups.length === 0) {
    return (
      <PanelContainer>
        <PanelHeader title="Duplicates" onClose={onClose} />
        <PanelContent>
          <PanelEmptyState
            icon={CheckCircle2}
            title="No Duplicates"
            description="All files are unique. No duplicate files detected."
          />
        </PanelContent>
      </PanelContainer>
    );
  }

  const selectedGroup = groups.find(g => g.group_id === selectedGroupId);

  return (
    <PanelContainer>
      <PanelHeader 
        title="Duplicates" 
        count={groups.length}
        onClose={onClose}
      />
      <PanelContent>
        {selectedGroup ? (
          <DuplicateGroupView
            group={selectedGroup}
            caseId={caseId}
            onBack={() => setSelectedGroupId(null)}
            onResolved={handleGroupResolved}
          />
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Stats Summary */}
              {stats && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Groups:</span>
                    <span className="font-medium">{stats.total_groups}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Duplicates:</span>
                    <span className="font-medium">{stats.total_duplicates}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Potential Savings:</span>
                    <span className="font-medium">{formatBytes(stats.total_size_savings)}</span>
                  </div>
                </div>
              )}

              {/* Duplicate Groups List */}
              <div className="space-y-2">
                {groups.map((group) => {
                  const primaryFile = group.files.find(f => f.is_primary) || group.files[0];
                  const duplicateCount = group.count - 1;
                  const totalSize = group.files.reduce((sum, f) => sum + f.file_size, 0);
                  const savingsSize = totalSize - primaryFile.file_size;

                  return (
                    <PanelCard
                      key={group.group_id}
                      onClick={() => handleGroupSelect(group.group_id)}
                      className={selectedGroupId === group.group_id ? 'ring-2 ring-primary' : ''}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">{primaryFile.file_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {primaryFile.folder_path}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{group.count} files</span>
                            <span>•</span>
                            <span>Save {formatBytes(savingsSize)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGroupSelect(group.group_id);
                          }}
                        >
                          Review
                        </Button>
                      </div>
                    </PanelCard>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </PanelContent>
    </PanelContainer>
  );
}

