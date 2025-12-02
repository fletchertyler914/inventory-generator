import { memo, useMemo } from 'react';
import { EditableCell } from './EditableCell';
import { StatusCell } from './StatusCell';
import { TagsCell } from './TagsCell';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryItemField, FileStatus } from '@/types/inventory';
import type { TableColumn } from '@/types/tableColumns';
import { format } from 'date-fns';

interface ColumnCellRendererProps {
  column: TableColumn;
  item: InventoryItem;
  onUpdate: (field: InventoryItemField, value: string | FileStatus | string[]) => void;
}

/**
 * ELITE: Cached fieldPath parsing - parse once, reuse forever
 */
const fieldPathCache = new Map<string, string[]>();
const getFieldPathParts = (path: string): string[] => {
  if (!fieldPathCache.has(path)) {
    fieldPathCache.set(path, path.split('.'));
  }
  return fieldPathCache.get(path)!;
};

/**
 * Type for parsed inventory data (nested object structure)
 */
type ParsedInventoryData = Record<string, unknown>;

/**
 * Extended InventoryItem with optional inventory_data field
 */
interface InventoryItemWithData extends InventoryItem {
  inventory_data?: string;
}

/**
 * ELITE: Cached JSON parsing - parse once per item, reuse forever
 * Uses WeakMap so items can be garbage collected
 */
const jsonCache = new WeakMap<InventoryItem, ParsedInventoryData>();
const getParsedInventoryData = (item: InventoryItem): ParsedInventoryData => {
  if (!jsonCache.has(item)) {
    try {
      // Try to parse inventory_data if it exists as a string
      const itemWithData = item as InventoryItemWithData;
      const parsed = JSON.parse(itemWithData.inventory_data || '{}') as ParsedInventoryData;
      jsonCache.set(item, parsed);
    } catch {
      jsonCache.set(item, {});
    }
  }
  return jsonCache.get(item) || {};
};

/**
 * ELITE: Memoized cell value extraction with caching
 * Optimized for performance: minimal allocations, cached parsing
 */
type CellValue = string | number | FileStatus | string[] | undefined;
type NestedValue = string | number | boolean | null | NestedValue[] | { [key: string]: NestedValue };

const getCellValue = (column: TableColumn, item: InventoryItem): CellValue => {
  // Handle custom columns with fieldPath
  if (column.custom && column.fieldPath) {
    const parts = getFieldPathParts(column.fieldPath);
    let value: NestedValue | InventoryItem | undefined = item;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      
      if (value && typeof value === 'object' && !Array.isArray(value) && part in value) {
        const nextValue: NestedValue | undefined = (value as Record<string, NestedValue>)[part];
        if (nextValue === undefined) {
          return undefined;
        }
        value = nextValue;
      } else {
        // Try parsing inventory_data if it's a JSON string
        if (part === 'inventory_data') {
          value = getParsedInventoryData(item) as NestedValue;
          continue;
        }
        return undefined;
      }
    }
    
    // Convert nested value to cell value type
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return typeof value === 'boolean' ? String(value) : value;
    }
    if (Array.isArray(value)) {
      return value.map(v => String(v));
    }
    return String(value);
  }
  
  // Handle standard columns - direct property access (fastest path)
  const field = column.id as InventoryItemField;
  if (field in item) {
    return item[field] as CellValue;
  }
  
  // ELITE: Check inventory_data for computed fields (file_extension, parent_folder, etc.)
  // These are stored in inventory_data JSON but not in the InventoryItem type
  const computedFields = [
    'file_extension', 'parent_folder', 'folder_depth', 'file_path_segments',
    'file_size', 'created_at', 'modified_at', 'file_hash', 'mime_type', 'content_type'
  ];
  
  if (computedFields.includes(column.id)) {
    const parsedData = getParsedInventoryData(item);
    const computedValue = parsedData[column.id];
    if (computedValue !== undefined) {
      if (typeof computedValue === 'string' || typeof computedValue === 'number' || typeof computedValue === 'boolean') {
        return typeof computedValue === 'boolean' ? String(computedValue) : computedValue;
      }
      if (Array.isArray(computedValue)) {
        return computedValue.map(v => String(v));
      }
      return String(computedValue);
    }
  }
  
  return undefined;
};

/**
 * ELITE: Memoized value formatting with caching
 * Caches expensive operations (date formatting, number formatting)
 */
const formatCache = new Map<string, string>();
const formatCellValue = (value: CellValue, renderer?: string, cacheKey?: string): string => {
  // Check cache first
  if (cacheKey && formatCache.has(cacheKey)) {
    return formatCache.get(cacheKey)!;
  }
  
  if (value === undefined || value === null || value === '') {
    const result = '—';
    if (cacheKey) formatCache.set(cacheKey, result);
    return result;
  }
  
  let result: string;
  
  if (renderer === 'date' && typeof value === 'number') {
    try {
      result = format(new Date(value * 1000), 'MMM d, yyyy');
    } catch {
      result = String(value);
    }
  } else if (renderer === 'number' && typeof value === 'number') {
    result = value.toLocaleString();
  } else if (renderer === 'date' && typeof value === 'string') {
    try {
      result = format(new Date(value), 'MMM d, yyyy');
    } catch {
      result = value;
    }
  } else {
    result = String(value);
  }
  
  // Cache result if cacheKey provided
  if (cacheKey && result.length < 100) { // Only cache small values to prevent memory bloat
    formatCache.set(cacheKey, result);
  }
  
  return result;
};

/**
 * ELITE: ColumnCellRenderer - Optimized cell rendering with memoization
 * Supports all renderer types: text, date, number, badge, status, tags, editable
 * 
 * Performance optimizations:
 * - Memoized value extraction with caching
 * - Cached JSON parsing
 * - Memoized formatting
 * - Minimal re-renders
 */
export const ColumnCellRenderer = memo(function ColumnCellRenderer({
  column,
  item,
  onUpdate,
}: ColumnCellRendererProps) {
  // ELITE: Memoize value extraction and formatting
  const { value, formattedValue } = useMemo(() => {
    const cellValue = getCellValue(column, item);
    const renderer = column.renderer || 'text';
    
    // Generate cache key for formatting (only for expensive operations)
    const shouldCache = renderer === 'date' || renderer === 'number';
    const key = shouldCache ? `${column.id}:${cellValue}:${renderer}` : undefined;
    
    // Format value if needed (cached for date/number)
    const formatted = shouldCache 
      ? formatCellValue(cellValue, renderer, key)
      : formatCellValue(cellValue, renderer);
    
    return {
      value: cellValue,
      formattedValue: formatted,
    };
  }, [column, item]);
  
  const renderer = column.renderer || 'text';
  const field = column.id as InventoryItemField;
  
  // Editable cells
  if (renderer === 'editable') {
    const saveHandler = (newValue: string) => {
      if (field === 'doc_year') {
        const numValue = parseInt(newValue) || 0;
        onUpdate(field, String(numValue));
      } else {
        onUpdate(field, newValue);
      }
    };
    
    const cellValue = value === undefined || value === null ? '' : String(value);
    const cellType = field === 'doc_year' ? 'number' : field === 'date_rcvd' ? 'date' : 'text';
    
    const editableProps: {
      value: string | number;
      onSave: (value: string) => void;
      placeholder: string;
      type: "text" | "number" | "date";
      className?: string;
    } = {
      value: field === 'doc_year' ? (typeof value === 'number' ? value : parseInt(cellValue) || 0) : cellValue,
      onSave: saveHandler,
      placeholder: "—",
      type: cellType,
    };
    
    if (field === 'notes') {
      editableProps.className = 'notes';
    }
    
    return <EditableCell {...editableProps} />;
  }
  
  // Status cells
  if (renderer === 'status' && field === 'status') {
    return (
      <StatusCell
        status={item.status}
        onStatusChange={(status) => onUpdate('status', status)}
      />
    );
  }
  
  // Tags cells
  if (renderer === 'tags' && field === 'tags') {
    return (
      <TagsCell
        tags={item.tags}
        onTagsChange={(tags) => onUpdate('tags', tags)}
      />
    );
  }
  
  // Badge cells
  if (renderer === 'badge') {
    const displayValue = formattedValue;
    if (displayValue === '—' || !value) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-medium"
        aria-label={`${column.label}: ${displayValue}`}
      >
        {displayValue}
      </Badge>
    );
  }
  
  // Number cells
  if (renderer === 'number') {
    return (
      <span className="text-xs text-muted-foreground font-mono">
        {formattedValue}
      </span>
    );
  }
  
  // Date cells
  if (renderer === 'date') {
    return (
      <span className="text-xs text-muted-foreground">
        {formattedValue}
      </span>
    );
  }
  
  // Text cells (default)
  const displayValue = formattedValue;
  const isTruncated = displayValue.length > 30;
  
  const content = (
    <span
      className={cn(
        "text-xs truncate block",
        field === 'file_name' && "font-mono text-foreground/80",
        field === 'folder_path' && "font-mono text-muted-foreground/80",
        field === 'document_type' && "font-semibold text-foreground",
        field === 'document_description' && "text-foreground/90",
        field === 'folder_name' && "text-muted-foreground",
        !isTruncated && displayValue === '—' && "text-muted-foreground"
      )}
    >
      {displayValue}
    </span>
  );
  
  if (isTruncated && displayValue !== '—') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-md break-words whitespace-normal">{displayValue}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return content;
}, (prevProps, nextProps) => {
  // ELITE: Custom comparison - only re-render if data actually changed
  // Compare item by reference (should be stable if using proper state management)
  // Compare column by id and renderer (config changes)
  return (
    prevProps.item === nextProps.item &&
    prevProps.column.id === nextProps.column.id &&
    prevProps.column.renderer === nextProps.column.renderer &&
    prevProps.column.custom === nextProps.column.custom &&
    prevProps.column.fieldPath === nextProps.column.fieldPath &&
    prevProps.onUpdate === nextProps.onUpdate
  );
});

