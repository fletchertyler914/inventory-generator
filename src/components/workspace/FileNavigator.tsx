import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Search, Folder, ChevronRight, ChevronDown, ChevronUp, PanelLeftClose, PanelLeft, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/file-icon-utils';
import type { InventoryItem } from '@/types/inventory';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { DeleteFileDialog } from '../ui/delete-file-dialog';
import { useFileDuplicateCounts } from '@/hooks/useFileDuplicateCounts';
import { buildFolderTree, type FolderNode } from '@/lib/file-tree-utils';
import { DuplicateBadge } from '../duplicates/DuplicateBadge';

interface FileNavigatorProps {
  items: InventoryItem[];
  currentFile: InventoryItem | null;
  onFileSelect: (file: InventoryItem) => void;
  selectedFolderPath?: string | null;
  onFolderSelect?: (folderPath: string | null) => void;
  navigatorOpen?: boolean;
  onToggleNavigator?: () => void;
  onFileRemove?: (file: InventoryItem) => void;
  caseId?: string;
}

/**
 * FileNavigator - Folder tree structure for browsing files
 * 
 * ELITE FEATURES:
 * - Folder tree navigation (not redundant with table)
 * - Collapsible folders
 * - File type icons
 * - Current file highlighting
 * - Search filters folders and files
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized to prevent unnecessary re-renders
 * - Optimized folder tree building with useMemo
 * - Memoized event handlers
 */
export const FileNavigator = memo(function FileNavigator({
  items,
  currentFile,
  onFileSelect,
  selectedFolderPath,
  onFolderSelect,
  navigatorOpen = true,
  onToggleNavigator,
  onFileRemove,
  caseId,
}: FileNavigatorProps) {
  // Feature flag for bulk delete
  const bulkDeleteEnabled = import.meta.env.VITE_BULK_DELETE_ENABLED === 'true' || import.meta.env.BULK_DELETE_ENABLED === 'true';
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<InventoryItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Fetch duplicate counts and group IDs for all files in the case
  const { duplicateCounts, duplicateGroupIds } = useFileDuplicateCounts(caseId);

  // Build folder tree structure using shared utility
  const folderTree = useMemo(() => {
    return buildFolderTree(items);
  }, [items]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return folderTree;

    const query = searchQuery.toLowerCase();
    const filterNode = (node: FolderNode): FolderNode | null => {
      const filtered: FolderNode = {
        name: node.name,
        path: node.path,
        files: node.files.filter(item => {
          // Helper to get field from inventory_data
          const getInventoryField = (item: InventoryItem, field: string): string => {
            if (!item.inventory_data) return '';
            try {
              const data = JSON.parse(item.inventory_data);
              return data[field] || '';
            } catch {
              return '';
            }
          };
          return item.file_name.toLowerCase().includes(query) ||
            getInventoryField(item, 'document_type').toLowerCase().includes(query);
        }),
        subfolders: new Map(),
      };

      // Filter subfolders
      node.subfolders.forEach((subfolder, name) => {
        const filteredSubfolder = filterNode(subfolder);
        if (filteredSubfolder && (filteredSubfolder.files.length > 0 || filteredSubfolder.subfolders.size > 0)) {
          filtered.subfolders.set(name, filteredSubfolder);
        }
      });

      // Include folder if it matches search or has matching files/subfolders
      if (
        node.path.toLowerCase().includes(query) ||
        filtered.files.length > 0 ||
        filtered.subfolders.size > 0
      ) {
        return filtered;
      }

      return null;
    };

    return filterNode(folderTree) || folderTree;
  }, [folderTree, searchQuery]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Auto-expand folder for current file if not already expanded
  useEffect(() => {
    if (!currentFile) return;

    const folderPath = currentFile.folder_path || '';
    if (!folderPath) return; // File is in root, nothing to expand

    // Parse folder path into segments
    const pathParts = folderPath.split('/').filter(p => p.trim());
    if (pathParts.length === 0) return; // No folders to expand

    // Build all parent folder paths
    const parentPaths: string[] = [];
    for (let i = 1; i <= pathParts.length; i++) {
      parentPaths.push(pathParts.slice(0, i).join('/'));
    }

    // Use functional update to check and expand only if needed
    setExpandedFolders(prev => {
      // Check if any parent folders are not expanded
      const needsExpansion = parentPaths.some(path => !prev.has(path));
      
      if (!needsExpansion) {
        return prev; // No change needed
      }

      // Add all parent paths
      const next = new Set(prev);
      parentPaths.forEach(path => next.add(path));
      return next;
    });
  }, [currentFile]);

  // Collect all folder paths recursively
  function getAllFolderPaths(node: FolderNode): string[] {
    const paths: string[] = [];
    if (node.path) {
      paths.push(node.path);
    }
    node.subfolders.forEach(subfolder => {
      paths.push(...getAllFolderPaths(subfolder));
    });
    return paths;
  }

  // Expand all folders - use filteredTree if search is active, otherwise use folderTree
  const expandAll = useCallback(() => {
    const treeToUse = searchQuery.trim() ? filteredTree : folderTree;
    const allPaths = getAllFolderPaths(treeToUse);
    setExpandedFolders(new Set(allPaths));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderTree, filteredTree, searchQuery]);

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);


  const handleDeleteClick = useCallback((e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    setFileToDelete(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (fileToDelete && onFileRemove) {
      onFileRemove(fileToDelete);
      setSelectedFiles(prev => {
        const next = new Set(prev);
        next.delete(fileToDelete.absolute_path);
        return next;
      });
    }
    setFileToDelete(null);
  }, [fileToDelete, onFileRemove]);

  const handleFileSelect = useCallback((item: InventoryItem, checked: boolean) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(item.absolute_path);
      } else {
        next.delete(item.absolute_path);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Select all visible files (from filtered tree)
      const allFiles: string[] = [];
      const collectFiles = (node: FolderNode) => {
        node.files.forEach(file => allFiles.push(file.absolute_path));
        node.subfolders.forEach(subfolder => collectFiles(subfolder));
      };
      collectFiles(filteredTree);
      setSelectedFiles(new Set(allFiles));
    } else {
      setSelectedFiles(new Set());
    }
  }, [filteredTree]);

  const handleBulkDelete = useCallback(async () => {
    if (!onFileRemove || selectedFiles.size === 0) return;
    
    const filesToDelete = items.filter(item => selectedFiles.has(item.absolute_path));
    
    // Delete each file sequentially to avoid race conditions
    for (const file of filesToDelete) {
      try {
        await onFileRemove(file);
      } catch (error) {
        console.error('Failed to delete file:', file.file_name, error);
        // Continue with other files even if one fails
      }
    }
    
    // Clear selection after deletion
    setSelectedFiles(new Set());
  }, [selectedFiles, items, onFileRemove]);

  // Get all visible files count
  const visibleFilesCount = useMemo(() => {
    let count = 0;
    const countFiles = (node: FolderNode) => {
      count += node.files.length;
      node.subfolders.forEach(subfolder => countFiles(subfolder));
    };
    countFiles(filteredTree);
    return count;
  }, [filteredTree]);

  const allVisibleSelected = useMemo(() => {
    if (visibleFilesCount === 0) return false;
    let selectedCount = 0;
    const countSelected = (node: FolderNode) => {
      node.files.forEach(file => {
        if (selectedFiles.has(file.absolute_path)) selectedCount++;
      });
      node.subfolders.forEach(subfolder => countSelected(subfolder));
    };
    countSelected(filteredTree);
    return selectedCount === visibleFilesCount && selectedCount > 0;
  }, [filteredTree, selectedFiles, visibleFilesCount]);

  // Define renderFolder as a regular function to allow recursion
  function renderFolder(node: FolderNode, level: number = 0): React.ReactNode {
    const isRoot = !node.path;
    const isExpanded = isRoot || expandedFolders.has(node.path);
    const hasContent = node.files.length > 0 || node.subfolders.size > 0;

    return (
      <div key={node.path || 'root'}>
        {/* Render folder button (skip for root) */}
        {!isRoot && (
          <div className="flex items-center w-full min-w-0" style={{ paddingLeft: `${8 + level * 12}px` }}>
            {/* Chevron button for expand/collapse */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 flex-shrink-0"
              title={isExpanded ? "Collapse folder" : "Expand folder"}
            >
              {hasContent ? (
                isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )
              ) : (
                <div className="h-3.5 w-3.5" />
              )}
            </Button>
            {/* Folder name button for selection/filtering */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                if (onFolderSelect) {
                  // Toggle: if already selected, deselect (show all); otherwise select this folder
                  onFolderSelect(selectedFolderPath === node.path ? null : node.path);
                }
              }}
              variant="ghost"
              className={cn(
                "flex-1 justify-start px-1 sm:px-2 py-2 h-auto text-sm gap-1 sm:gap-2 overflow-hidden min-w-0 items-center max-w-full",
                level === 0 && "font-medium",
                selectedFolderPath === node.path && "bg-primary/10 border border-primary/20"
              )}
              title={selectedFolderPath === node.path ? "Click to show all files" : "Click to filter board to this folder"}
            >
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1 text-left min-w-0">{node.name}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                {node.files.length + Array.from(node.subfolders.values()).reduce((sum, sub) => sum + sub.files.length, 0)}
              </span>
            </Button>
          </div>
        )}

        {/* Render children (always render for root, conditionally for others) */}
        {isExpanded && (
          <div>
            {/* Render subfolders */}
            {Array.from(node.subfolders.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(subfolder => renderFolder(subfolder, isRoot ? 0 : level + 1))}

            {/* Render files in this folder */}
            {node.files
              .sort((a, b) => a.file_name.localeCompare(b.file_name))
              .map((item) => (
                <ContextMenu key={item.absolute_path}>
                  <ContextMenuTrigger asChild>
                    <div
                  className={cn(
                        "w-full text-left px-2 sm:px-3 py-2 rounded-md text-sm transition-colors relative",
                        "hover:bg-muted/50 flex items-center gap-1 sm:gap-2 overflow-hidden min-w-0 group",
                        currentFile?.absolute_path === item.absolute_path && "bg-primary/10 text-primary font-medium"
                  )}
                  style={{ paddingLeft: `${isRoot ? 8 : 32 + level * 12}px` }}
                    >
                      {bulkDeleteEnabled && (
                        <Checkbox
                          checked={selectedFiles.has(item.absolute_path)}
                          onCheckedChange={(checked) => handleFileSelect(item, checked === true)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 flex-shrink-0"
                        />
                      )}
                      <button
                        onClick={() => onFileSelect(item)}
                        className="flex items-center gap-1 sm:gap-2 overflow-hidden min-w-0 flex-1 justify-start h-auto py-0 px-0 text-left font-inherit text-sm max-w-full group/file-item cursor-pointer [&_*]:pointer-events-none"
                      >
                        <span className="flex-shrink-0 flex items-center">{getFileIcon(item.file_type)}</span>
                        <span className="truncate flex-1 text-sm leading-normal min-w-0">{item.file_name}</span>
                        {item.id && duplicateCounts.has(item.id) && (
                          <DuplicateBadge
                            groupId={duplicateGroupIds.get(item.id)}
                            count={duplicateCounts.get(item.id) || 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open duplicate management - would need parent handler
                            }}
                            className="flex-shrink-0 ml-1.5 pointer-events-auto"
                          />
                        )}
                      </button>
                    </div>
                  </ContextMenuTrigger>
                  {onFileRemove && (
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          setFileToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from case
                      </ContextMenuItem>
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              ))}
          </div>
        )}
      </div>
    );
  }

    return (
      <div className="h-full flex flex-col min-w-0 overflow-hidden" style={{ minWidth: '240px' }}>
      <div className="p-2 sm:p-3 border-b border-border/40 dark:border-border/50 flex-shrink-0 min-w-0">
        <div className="relative flex items-center gap-1 sm:gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 sm:pl-9 h-8 text-sm min-w-0"
            />
          </div>
          {onToggleNavigator && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleNavigator}
              className="h-8 w-8 flex-shrink-0"
              title={navigatorOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {navigatorOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {bulkDeleteEnabled && (
          <div className="flex items-center gap-1">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={handleSelectAll}
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">
              {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select all'}
            </span>
          </div>
        )}
        {bulkDeleteEnabled && selectedFiles.size > 0 && onFileRemove && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="w-full flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 sm:p-3 space-y-1 min-w-0">
          {/* "All Files" option to clear folder filter */}
          {onFolderSelect && (
            <Button
              onClick={() => onFolderSelect(null)}
              variant="ghost"
              className={cn(
                "w-full justify-start px-2 sm:px-3 py-2 h-auto text-sm flex items-center gap-1 sm:gap-2 overflow-hidden min-w-0 font-medium max-w-full",
                !selectedFolderPath && "bg-primary/10 border border-primary/20"
              )}
              title="Show all files in table"
            >
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1 text-left min-w-0">All Files</span>
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    collapseAll();
                  }}
                  variant="ghost"
                  size="icon-sm"
                  className="p-0.5 h-auto w-auto flex-shrink-0"
                  title="Collapse all folders"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    expandAll();
                  }}
                  variant="ghost"
                  size="icon-sm"
                  className="p-0.5 h-auto w-auto flex-shrink-0"
                  title="Expand all folders"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground hidden sm:inline">{items.length}</span>
              </div>
            </Button>
          )}
          {filteredTree.subfolders.size === 0 && filteredTree.files.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery ? 'No folders or files match your search' : 'No files in case'}
            </div>
          ) : (
            renderFolder(filteredTree)
          )}
        </div>
      </ScrollArea>
      {fileToDelete && (
        <DeleteFileDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          fileName={fileToDelete.file_name}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom memoization comparison
  return (
    prevProps.items === nextProps.items &&
    prevProps.currentFile?.id === nextProps.currentFile?.id &&
    prevProps.currentFile?.absolute_path === nextProps.currentFile?.absolute_path &&
    prevProps.selectedFolderPath === nextProps.selectedFolderPath &&
    prevProps.navigatorOpen === nextProps.navigatorOpen &&
    prevProps.caseId === nextProps.caseId &&
    prevProps.onFileSelect === nextProps.onFileSelect &&
    prevProps.onFolderSelect === nextProps.onFolderSelect &&
    prevProps.onToggleNavigator === nextProps.onToggleNavigator &&
    prevProps.onFileRemove === nextProps.onFileRemove
  )
})

