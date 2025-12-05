import { useMemo } from 'react';

interface CsvViewerProps {
  data: string;
}

/**
 * Simple CSV viewer component
 * Parses CSV data and displays it in a table format
 */
export function CsvViewer({ data }: CsvViewerProps) {
  const parsedData = useMemo(() => {
    if (!data) return [];
    
    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Try to detect delimiter
    const firstLine = lines[0];
    if (!firstLine) return [];
    
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount > tabCount) {
      delimiter = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
      delimiter = '\t';
    }
    
    // Parse CSV (simple parser - doesn't handle quoted fields with commas)
    const rows = lines.map(line => {
      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      
      return cells;
    });
    
    return rows;
  }, [data]);

  if (parsedData.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>No data to display</p>
      </div>
    );
  }

  const headers = parsedData[0];
  if (!headers) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>No headers found</p>
      </div>
    );
  }
  
  // Find the maximum number of columns across all rows to ensure uniform grid
  const maxColumns = Math.max(
    headers.length,
    ...parsedData.slice(1).map(row => row.length)
  );
  
  // Normalize headers to max columns
  const normalizedHeaders = (() => {
    const normalized = [...headers];
    while (normalized.length < maxColumns) {
      normalized.push('');
    }
    return normalized.slice(0, maxColumns);
  })();
  
  // Normalize rows to have the same number of columns
  const rows = parsedData.slice(1).map(row => {
    const normalized = [...row];
    while (normalized.length < maxColumns) {
      normalized.push('');
    }
    return normalized.slice(0, maxColumns);
  });

  return (
    <div className="w-full h-full overflow-auto">
      <table className="border-collapse border border-border/40 dark:border-border/50" style={{ tableLayout: 'auto', width: 'max-content' }}>
        <thead>
          <tr className="bg-muted">
            {normalizedHeaders.map((header, index) => (
              <th
                key={index}
                className="border border-border/40 dark:border-border/50 p-2 text-left text-sm font-semibold sticky top-0 bg-muted z-10 whitespace-nowrap"
                style={{ minWidth: '150px', maxWidth: 'none' }}
              >
                {header || `Column ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/50">
              {row.map((cellValue, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-border/40 dark:border-border/50 p-2 text-sm whitespace-nowrap"
                  style={{ minWidth: '150px', maxWidth: 'none', overflow: 'visible' }}
                >
                  <span style={{ display: 'inline-block', maxWidth: 'none' }}>{cellValue || '\u00A0'}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

