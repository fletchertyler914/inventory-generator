import React, { useMemo, useCallback, useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, FileText, Image, File, Folder, ChevronRight, ChevronDown, ChevronsUpDown, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InventoryItem } from '@/types/inventory';

interface FileNavigatorProps {
  items: InventoryItem[];
  currentFile: InventoryItem | null;
  onFileSelect: (file: InventoryItem) => void;
  selectedFolderPath?: string | null;
  onFolderSelect?: (folderPath: string | null) => void;
  navigatorOpen?: boolean;
  onToggleNavigator?: () => void;
}

interface FolderNode {
  name: string;
  path: string;
  files: InventoryItem[];
  subfolders: Map<string, FolderNode>;
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
 */
export function FileNavigator({
  items,
  currentFile,
  onFileSelect,
  selectedFolderPath,
  onFolderSelect,
  navigatorOpen = true,
  onToggleNavigator,
}: FileNavigatorProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const root: FolderNode = {
      name: '',
      path: '',
      files: [],
      subfolders: new Map(),
    };

    items.forEach(item => {
      // Handle empty or root folder paths
      const folderPath = item.folder_path || '';
      
      // Parse folder path into segments
      const pathParts = folderPath.split('/').filter(p => p.trim());
      
      // If no folder path, add file to root
      if (pathParts.length === 0) {
        root.files.push(item);
        return;
      }

      let current = root;

      // Navigate/create folder structure
      pathParts.forEach((part, index) => {
        if (!current.subfolders.has(part)) {
          const fullPath = pathParts.slice(0, index + 1).join('/');
          current.subfolders.set(part, {
            name: part,
            path: fullPath,
            files: [],
            subfolders: new Map(),
          });
        }
        current = current.subfolders.get(part)!;
      });

      // Add file to current folder
      current.files.push(item);
    });

    return root;
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

  const getFileIcon = useCallback((fileType: string) => {
    const ext = fileType.toLowerCase();
    if (['pdf'].includes(ext)) return <FileText className="h-4 w-4 flex-shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <Image className="h-4 w-4 flex-shrink-0" />;
    return <File className="h-4 w-4 flex-shrink-0" />;
  }, []);

  // Define renderFolder as a regular function to allow recursion
  function renderFolder(node: FolderNode, level: number = 0): React.ReactNode {
    const isRoot = !node.path;
    const isExpanded = isRoot || expandedFolders.has(node.path);
    const hasContent = node.files.length > 0 || node.subfolders.size > 0;

    return (
      <div key={node.path || 'root'}>
        {/* Render folder button (skip for root) */}
        {!isRoot && (
          <button
            onClick={(e) => {
              if (e.detail === 1) {
                // Single click: toggle expand/collapse
                toggleFolder(node.path);
              } else if (e.detail === 2) {
                // Double click: select folder (filter table)
                e.preventDefault();
                if (onFolderSelect) {
                  onFolderSelect(selectedFolderPath === node.path ? null : node.path);
                }
              }
            }}
            onDoubleClick={(e) => {
              // Double click: select folder (filter table)
              e.preventDefault();
              if (onFolderSelect) {
                onFolderSelect(selectedFolderPath === node.path ? null : node.path);
              }
            }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 overflow-hidden min-w-0",
              "hover:bg-muted/50",
              level === 0 && "font-medium",
              selectedFolderPath === node.path && "bg-primary/10 border border-primary/20"
            )}
            style={{ paddingLeft: `${12 + level * 16}px` }}
            title="Double-click to filter table by this folder"
          >
            {hasContent ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )
            ) : (
              <div className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate flex-1">{node.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {node.files.length + Array.from(node.subfolders.values()).reduce((sum, sub) => sum + sub.files.length, 0)}
            </span>
          </button>
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
                <button
                  key={item.absolute_path}
                  onClick={() => onFileSelect(item)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-muted/50 flex items-center gap-2 overflow-hidden min-w-0",
                    currentFile?.absolute_path === item.absolute_path && "bg-primary/10 text-primary font-medium",
                    "group"
                  )}
                  style={{ paddingLeft: `${isRoot ? 12 : 28 + level * 16}px` }}
                >
                  {getFileIcon(item.file_type)}
                  <span className="truncate flex-1">{item.file_name}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex-shrink-0 space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          {onToggleNavigator && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleNavigator}
              className="h-9 w-9 flex-shrink-0"
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
        <div className="flex items-center gap-2">
          <button
            onClick={collapseAll}
            className="flex-1 px-3 py-1.5 text-xs rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
            title="Collapse all folders"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            <span>Collapse</span>
          </button>
          <button
            onClick={expandAll}
            className="flex-1 px-3 py-1.5 text-xs rounded-md bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
            title="Expand all folders"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 rotate-180" />
            <span>Expand</span>
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* "All Files" option to clear folder filter */}
          {onFolderSelect && (
            <button
              onClick={() => onFolderSelect(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 overflow-hidden min-w-0",
                "hover:bg-muted/50 font-medium",
                !selectedFolderPath && "bg-primary/10 border border-primary/20"
              )}
              title="Show all files in table"
            >
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1">All Files</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">{items.length}</span>
            </button>
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
    </div>
  );
}

