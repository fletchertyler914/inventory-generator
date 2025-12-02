/**
 * Mapping Preview - Show sample extracted data before confirming
 * ELITE: Visual confirmation for non-technical users
 */

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { CheckCircle2 } from 'lucide-react'
import type { DataSourceType, ExtractionMethod } from '@/types/mapping'

interface MappingPreviewProps {
  sourceType: DataSourceType
  extractionMethod: ExtractionMethod
  pattern?: string | undefined
  sampleData?: {
    file_name: string
    folder_name: string
    folder_path: string
  } | undefined
  columnLabel: string
}

export function MappingPreview({
  sourceType,
  extractionMethod,
  pattern,
  sampleData,
  columnLabel,
}: MappingPreviewProps) {
  // Get sample source value
  const sampleSource = sampleData
    ? sourceType === 'file_name' ? sampleData.file_name
      : sourceType === 'folder_name' ? sampleData.folder_name
      : sourceType === 'folder_path' ? sampleData.folder_path
      : ''
    : ''

  // Simulate extraction (simplified - actual extraction happens server-side)
  const extractedValue = useMemo(() => {
    if (!sampleSource) return 'No sample data'
    if (extractionMethod === 'direct') return sampleSource
    
    // For demo purposes, show what would be extracted
    if (extractionMethod === 'date') {
      // Try to find a date
      const dateMatch = sampleSource.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|[A-Za-z]+\s+\d{4}/)
      return dateMatch ? dateMatch[0] : 'No date found'
    }
    if (extractionMethod === 'number') {
      const numMatch = sampleSource.match(/\d+/)
      return numMatch ? numMatch[0] : 'No number found'
    }
    if (extractionMethod === 'pattern' && pattern) {
      try {
        const regex = new RegExp(pattern)
        const match = regex.exec(sampleSource)
        return match ? match[0] : 'No match found'
      } catch {
        return 'Invalid pattern'
      }
    }
    
    return sampleSource
  }, [sampleSource, extractionMethod, pattern])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 5: Preview & Confirm</CardTitle>
        <CardDescription>Review your mapping before creating it</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold">Mapping Summary</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Source</div>
              <Badge variant="outline" className="mt-1">
                {sourceType.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground">Method</div>
              <Badge variant="outline" className="mt-1">
                {extractionMethod === 'direct' ? 'Use as-is' : extractionMethod}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground">Column</div>
              <div className="font-semibold mt-1">{columnLabel || 'New column'}</div>
            </div>
            {pattern && (
              <div>
                <div className="text-muted-foreground">Pattern</div>
                <div className="font-mono text-xs mt-1 break-all">{pattern}</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Sample Extraction</div>
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Source:</div>
              <div className="font-mono text-sm break-all">{sampleSource || 'No sample data'}</div>
            </div>
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-1">Extracted:</div>
              <div className="font-semibold text-sm">{extractedValue}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div className="text-sm text-green-800 dark:text-green-200">
            Ready to create mapping. Click "Create Mapping" to finish.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

