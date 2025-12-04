import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { GripVertical, Plus, Trash2, EyeOff, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TableColumn, TableColumnConfig } from '@/types/tableColumns';
import { DEFAULT_COLUMNS, saveColumnConfig } from '@/types/tableColumns';
import { FieldMapperStepper } from '../mapping/FieldMapperStepper';
import { getMappingsForColumn } from '@/services/mappingService';

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TableColumnConfig;
  onConfigChange: (config: TableColumnConfig) => void;
  caseId?: string;
}

/**
 * ColumnManager - Simple, intuitive UI for customizing table columns
 * 
 * ELITE UX:
 * - Visual column list with show/hide toggles
 * - Drag-and-drop reordering (coming soon)
 * - Add custom columns with simple form
 * - Preview changes before applying
 * - Per-case or global column preferences
 */
export function ColumnManager({
  open,
  onOpenChange,
  config,
  onConfigChange,
  caseId,
}: ColumnManagerProps) {
  const [localConfig, setLocalConfig] = useState<TableColumnConfig>(config);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnField, setNewColumnField] = useState('');
  const [showMapper, setShowMapper] = useState(false);

  // Sync local config when prop changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleToggleVisibility = useCallback((columnId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      ),
    }));
  }, []);

  const handleAddCustomColumn = useCallback(() => {
    if (!newColumnName.trim() || !newColumnField.trim()) return;

    const newColumn: TableColumn = {
      id: `custom_${Date.now()}`,
      label: newColumnName.trim(),
      visible: true,
      order: localConfig.columns.length,
      custom: true,
      fieldPath: newColumnField.trim(),
      renderer: 'text',
    };

    setLocalConfig(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn],
    }));

    setNewColumnName('');
    setNewColumnField('');
    setShowAddCustom(false);
  }, [newColumnName, newColumnField, localConfig.columns.length]);

  const handleDeleteCustomColumn = useCallback((columnId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      columns: prev.columns.filter(col => col.id !== columnId),
    }));
  }, []);

  const handleApply = useCallback(() => {
    onConfigChange(localConfig);
    saveColumnConfig(localConfig, caseId).catch(console.error);
    onOpenChange(false);
  }, [localConfig, onConfigChange, caseId, onOpenChange]);

  const handleReset = useCallback(() => {
    const defaultConfig: TableColumnConfig = {
      columns: DEFAULT_COLUMNS,
      version: 1,
    };
    setLocalConfig(defaultConfig);
  }, []);

  const visibleColumns = localConfig.columns.filter(col => col.visible);
  const hiddenColumns = localConfig.columns.filter(col => !col.visible);

  // Check which columns have active mappings
  const getColumnMappings = useCallback((columnId: string) => {
    return getMappingsForColumn(columnId, caseId);
  }, [caseId]);

  const handleColumnCreated = useCallback((newColumn: TableColumn) => {
    setLocalConfig(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn],
    }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Table Columns</DialogTitle>
          <DialogDescription>
            Choose which columns to show and reorder them. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Visible Columns */}
          <div className="mb-4">
            <Label className="text-sm font-semibold mb-2 block">
              Visible Columns ({visibleColumns.length})
            </Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-1">
                {visibleColumns.map((column) => (
                  <div
                    key={column.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors",
                      column.custom && "bg-muted/30"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Checkbox
                      checked={column.visible}
                      onCheckedChange={() => handleToggleVisibility(column.id)}
                      id={`col-${column.id}`}
                    />
                    <Label
                      htmlFor={`col-${column.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {column.label}
                      {column.custom && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (custom)
                        </span>
                      )}
                      {getColumnMappings(column.id).length > 0 && (
                        <span className="text-xs text-primary ml-2" title={`${getColumnMappings(column.id).length} active mapping(s)`}>
                          (mapped)
                        </span>
                      )}
                    </Label>
                    {column.custom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCustomColumn(column.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Hidden Columns */}
          {hiddenColumns.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Hidden Columns ({hiddenColumns.length})
              </Label>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <div className="space-y-1">
                  {hiddenColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors opacity-60"
                    >
                      <Checkbox
                        checked={column.visible}
                        onCheckedChange={() => handleToggleVisibility(column.id)}
                        id={`col-hidden-${column.id}`}
                      />
                      <Label
                        htmlFor={`col-hidden-${column.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Manage Mappings */}
          <div className="border-t pt-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMapper(true)}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Map Data to Columns
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Create simple mappings to extract data from files and folders
            </p>
          </div>

          {/* Add Custom Column */}
          <div className="border-t pt-4">
            {!showAddCustom ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCustom(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Column
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-name">Column Name</Label>
                  <Input
                    id="custom-name"
                    placeholder="e.g., Client Name, Case Number"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-field">
                    Data Field Path
                    <span className="text-xs text-muted-foreground ml-2">
                      (e.g., metadata.client_name or inventory_data.client)
                    </span>
                  </Label>
                  <Input
                    id="custom-field"
                    placeholder="metadata.custom_field"
                    value={newColumnField}
                    onChange={(e) => setNewColumnField(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddCustomColumn}
                    disabled={!newColumnName.trim() || !newColumnField.trim()}
                  >
                    Add Column
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddCustom(false);
                      setNewColumnName('');
                      setNewColumnField('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Field Mapper Stepper */}
      <FieldMapperStepper
        open={showMapper}
        onOpenChange={setShowMapper}
        {...(caseId !== undefined && { caseId })}
        sampleData={{
          file_name: 'example_file_2024.pdf',
          folder_name: 'Documents',
          folder_path: 'Documents/2024',
        }}
      />
    </Dialog>
  );
}

