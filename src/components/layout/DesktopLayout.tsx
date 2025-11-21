import { useState } from 'react';
import { SidebarContent } from './SidebarContent';
import { TableContent } from './TableContent';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';
import type { RecentInventory } from '@/hooks/useRecentInventories';

interface DesktopLayoutProps {
  items: InventoryItem[];
  onItemsChange: (items: InventoryItem[]) => void;
  caseNumber: string;
  onCaseNumberChange: (value: string) => void;
  onBulkSetDateRcvd: (date: string, indices?: number[]) => void;
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
  loading: boolean;
  selectedFolder: string | null;
  onFolderSelected: (path: string) => void;
  recentInventories?: RecentInventory[];
  onOpenRecentInventory?: (inventory: RecentInventory) => void;
  onRemoveRecentInventory?: (id: string) => void;
  onExportComplete?: (filePath: string, items: InventoryItem[], caseNumber: string | null, folderPath: string | null) => void;
  onImportComplete?: (filePath: string, items: InventoryItem[], caseNumber: string | null, folderPath: string | null) => void;
  onFolderPathRestored?: (folderPath: string) => void;
  onSyncInventory?: () => void;
  exportDialogOpen?: boolean;
  onExportDialogOpenChange?: (open: boolean) => void;
  importDialogOpen?: boolean;
  onImportDialogOpenChange?: (open: boolean) => void;
  bulkDateInputRef?: React.RefObject<HTMLInputElement>;
}

export function DesktopLayout({
  items,
  onItemsChange,
  caseNumber,
  onCaseNumberChange,
  onBulkSetDateRcvd,
  selectedIndices,
  onSelectionChange,
  loading,
  selectedFolder,
  onFolderSelected,
  recentInventories = [],
  onOpenRecentInventory,
  onRemoveRecentInventory,
  onExportComplete,
  onImportComplete,
  onFolderPathRestored,
  onSyncInventory,
  exportDialogOpen,
  onExportDialogOpenChange,
  importDialogOpen,
  onImportDialogOpenChange,
  bulkDateInputRef,
}: DesktopLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-background relative'>
      {/* Left Sidebar */}
      <aside
        className={`
          border-r border-border bg-card flex flex-col flex-shrink-0 transition-all duration-200 ease-in-out relative
          ${isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'}
        `}
      >
        <SidebarContent
          onFolderSelected={onFolderSelected}
          items={items}
          caseNumber={caseNumber}
          onCaseNumberChange={onCaseNumberChange}
          onBulkSetDateRcvd={onBulkSetDateRcvd}
          selectedIndices={selectedIndices}
          onItemsChange={onItemsChange}
          loading={loading}
          selectedFolder={selectedFolder}
          onExportComplete={onExportComplete}
          onImportComplete={onImportComplete}
          onFolderPathRestored={onFolderPathRestored}
          onSyncInventory={onSyncInventory}
          exportDialogOpen={exportDialogOpen}
          onExportDialogOpenChange={onExportDialogOpenChange}
          importDialogOpen={importDialogOpen}
          onImportDialogOpenChange={onImportDialogOpenChange}
          bulkDateInputRef={bulkDateInputRef}
        />
        
        {/* Toggle Button - Inside Sidebar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 h-7 w-7 rounded border border-border bg-background hover:bg-muted transition-colors duration-150"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </aside>

      {/* Toggle Button - When Sidebar is Collapsed */}
      {isSidebarCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-r border-l-0 border border-border bg-background hover:bg-muted transition-colors duration-150"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Right Content Area */}
      <main className='flex-1 flex flex-col overflow-hidden bg-background'>
        <TableContent
          items={items}
          onItemsChange={onItemsChange}
          onSelectionChange={onSelectionChange}
          loading={loading}
          selectedFolder={selectedFolder}
          recentInventories={recentInventories}
          onOpenRecentInventory={onOpenRecentInventory}
          onRemoveRecentInventory={onRemoveRecentInventory}
        />
      </main>
    </div>
  );
}
