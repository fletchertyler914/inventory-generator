import { FolderSelector } from '../FolderSelector';
import { ConfigForm } from '../ConfigForm';
import { ExportDialog } from '../ExportDialog';
import { ImportDialog } from '../ImportDialog';
import { ThemeToggle } from '../ThemeToggle';
import { Separator } from '../ui/separator';
import { KeyboardShortcutsHint } from '../KeyboardShortcutsHint';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';

interface SidebarContentProps {
  onFolderSelected: (path: string) => void;
  items: InventoryItem[];
  caseNumber: string;
  onCaseNumberChange: (value: string) => void;
  onBulkSetDateRcvd: (date: string, indices?: number[]) => void;
  selectedIndices: number[];
  onItemsChange: (items: InventoryItem[]) => void;
  loading: boolean;
  selectedFolder?: string | null;
  onExportComplete?: ((
    filePath: string,
    items: InventoryItem[],
    caseNumber: string | null,
    folderPath: string | null
  ) => void) | undefined;
  onImportComplete?: ((
    filePath: string,
    items: InventoryItem[],
    caseNumber: string | null,
    folderPath: string | null
  ) => void) | undefined;
  onFolderPathRestored?: ((folderPath: string) => void) | undefined;
  onSyncInventory?: (() => void) | undefined;
  exportDialogOpen?: boolean | undefined;
  onExportDialogOpenChange?: ((open: boolean) => void) | undefined;
  importDialogOpen?: boolean | undefined;
  onImportDialogOpenChange?: ((open: boolean) => void) | undefined;
  bulkDateInputRef?: React.RefObject<HTMLInputElement> | undefined;
}

export function SidebarContent({
  onFolderSelected,
  items,
  caseNumber,
  onCaseNumberChange,
  onBulkSetDateRcvd,
  selectedIndices,
  onItemsChange,
  loading,
  selectedFolder,
  onExportComplete,
  onImportComplete,
  onFolderPathRestored,
  onSyncInventory,
  exportDialogOpen,
  onExportDialogOpenChange,
  importDialogOpen,
  onImportDialogOpenChange,
  bulkDateInputRef,
}: SidebarContentProps) {
  return (
    <div className='flex flex-col h-full bg-card border-r border-border'>
      {/* Header */}
      <div className='p-6 border-b border-border bg-background'>
        <div className='flex items-center justify-between mb-2'>
          <h1 className='text-lg font-semibold text-foreground'>
            Document Inventory
          </h1>
          <ThemeToggle />
        </div>
        <p className='text-xs text-muted-foreground'>
          Generate comprehensive inventory spreadsheets
        </p>
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto'>
        <div className='p-6 space-y-6'>
          {/* Folder Selection */}
          <div className='space-y-3'>
            <label className='text-xs font-semibold text-foreground/60 uppercase tracking-wider block'>
              Source Folder
            </label>
            <FolderSelector
              onFolderSelected={onFolderSelected}
              disabled={loading}
            />
          </div>

          <Separator />

          {/* Configuration Form */}
          <div className='space-y-3'>
            <ConfigForm
              caseNumber={caseNumber}
              onCaseNumberChange={onCaseNumberChange}
              onBulkSetDateRcvd={onBulkSetDateRcvd}
              selectedIndices={selectedIndices}
              totalItems={items.length}
              bulkDateInputRef={bulkDateInputRef}
            />
          </div>

          <Separator />

          {/* Import */}
          <div className='space-y-3'>
            <label className='text-xs font-semibold text-foreground/60 uppercase tracking-wider block'>
              Import
            </label>
            <ImportDialog
              onItemsChange={onItemsChange}
              onCaseNumberChange={onCaseNumberChange}
              onImportComplete={onImportComplete}
              onFolderPathRestored={onFolderPathRestored}
              selectedFolder={selectedFolder}
              open={importDialogOpen}
              onOpenChange={onImportDialogOpenChange}
            />
          </div>

          <Separator />

          {/* Sync */}
          {items.length > 0 && selectedFolder && (
            <div className='space-y-3'>
              <label className='text-xs font-semibold text-foreground/60 uppercase tracking-wider block'>
                Sync
              </label>
              <Button
                onClick={onSyncInventory}
                disabled={loading || !selectedFolder}
                variant='outline'
                className='w-full'
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                Sync with Folder
              </Button>
              <p className='text-xs text-muted-foreground'>
                Update inventory to reflect changes in the source folder
              </p>
            </div>
          )}

          {items.length > 0 && selectedFolder && <Separator />}

          {/* Export */}
          <div className='space-y-3'>
            <label className='text-xs font-semibold text-foreground/60 uppercase tracking-wider block'>
              Export
            </label>
            <ExportDialog
              items={items}
              caseNumber={caseNumber}
              disabled={items.length === 0}
              onExportComplete={onExportComplete}
              selectedFolder={selectedFolder}
              open={exportDialogOpen}
              onOpenChange={onExportDialogOpenChange}
            />
          </div>

          <Separator />

          {/* Keyboard Shortcuts */}
          <div className='space-y-3'>
            <KeyboardShortcutsHint />
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      {items.length > 0 && (
        <div className='p-4 border-t border-border bg-muted/30'>
          <div className='flex items-center gap-2'>
            <div className='h-1.5 w-1.5 rounded-full bg-muted-foreground' />
            <p className='text-xs text-muted-foreground'>
              {items.length} file{items.length !== 1 ? 's' : ''} loaded
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
