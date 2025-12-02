/**
 * Field Mapper Stepper - Dead-simple visual wizard for non-technical users
 * ELITE: Intuitive 5-step process with live preview and validation
 */

import { useState, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ChevronRight, ChevronLeft, FileText, Folder, FolderTree, Database, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldMapping, DataSourceType, ExtractionMethod } from '@/types/mapping'
import { validatePattern } from '@/types/mapping'
import { addMapping } from '@/services/mappingService'
import { PatternBuilder } from './PatternBuilder'
import { MappingPreview } from './MappingPreview'
import type { TableColumn } from '@/types/tableColumns'

interface FieldMapperStepperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: TableColumn[]
  onColumnCreated?: (column: TableColumn) => void
  caseId?: string
  sampleData?: {
    file_name: string
    folder_name: string
    folder_path: string
  }
}

type Step = 1 | 2 | 3 | 4 | 5

export function FieldMapperStepper({
  open,
  onOpenChange,
  columns,
  onColumnCreated,
  caseId,
  sampleData,
}: FieldMapperStepperProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [sourceType, setSourceType] = useState<DataSourceType | ''>('')
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod | ''>('')
  const [pattern, setPattern] = useState('')
  const [patternFlags, setPatternFlags] = useState('')
  const [selectedColumnId, setSelectedColumnId] = useState<string>('')
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnRenderer, setNewColumnRenderer] = useState<'text' | 'date' | 'number' | 'badge'>('text')

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset all state
      setCurrentStep(1)
      setSourceType('')
      setExtractionMethod('')
      setPattern('')
      setPatternFlags('')
      setSelectedColumnId('')
      setNewColumnName('')
      setNewColumnRenderer('text')
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // Validation for each step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return sourceType !== ''
      case 2:
        return extractionMethod !== ''
      case 3:
        if (extractionMethod === 'direct') return true
        if (extractionMethod === 'date' || extractionMethod === 'number') return true
        return pattern.trim().length > 0 && validatePattern(pattern, extractionMethod as ExtractionMethod).valid
      case 4:
        return selectedColumnId !== '' || newColumnName.trim().length > 0
      case 5:
        return true
      default:
        return false
    }
  }, [currentStep, sourceType, extractionMethod, pattern, selectedColumnId, newColumnName])

  const handleNext = useCallback(() => {
    if (canProceed && currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }, [canProceed, currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }, [currentStep])

  const handleFinish = useCallback(() => {
    if (!canProceed) return

    // Create column if needed
    let targetColumnId = selectedColumnId
    if (!targetColumnId && newColumnName.trim()) {
      // Create new column (this would need to be handled by parent)
      targetColumnId = `custom_${Date.now()}`
      if (onColumnCreated) {
        onColumnCreated({
          id: targetColumnId,
          label: newColumnName.trim(),
          visible: true,
          order: columns.length,
          custom: true,
          fieldPath: `inventory_data.${targetColumnId}`,
          renderer: newColumnRenderer,
        })
      }
    }

    // Create mapping
    const mapping: FieldMapping = {
      id: `mapping_${Date.now()}`,
      columnId: targetColumnId,
      sourceType: sourceType as DataSourceType,
      extractionMethod: extractionMethod as ExtractionMethod,
      ...(extractionMethod !== 'direct' && pattern ? {
        patternConfig: {
          pattern,
          ...(patternFlags && { flags: patternFlags }),
          group: 0,
        }
      } : {}),
      enabled: true,
      priority: 1,
      description: `Extract from ${sourceType} using ${extractionMethod}`,
    }

    addMapping(mapping, caseId).catch(console.error)
    handleOpenChange(false)
  }, [canProceed, selectedColumnId, newColumnName, sourceType, extractionMethod, pattern, patternFlags, columns.length, newColumnRenderer, caseId, onColumnCreated, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Data to Column</DialogTitle>
          <DialogDescription>
            Create a simple mapping to extract data from files and folders
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {/* Step 1: Choose Data Source */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Where is your data?</CardTitle>
                <CardDescription>Choose where to extract data from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceType('file_name')}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      sourceType === 'file_name' && "border-primary bg-primary/5"
                    )}
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    <div className="font-semibold">File Name</div>
                    <div className="text-sm text-muted-foreground">Extract from file names</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('folder_name')}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      sourceType === 'folder_name' && "border-primary bg-primary/5"
                    )}
                  >
                    <Folder className="h-6 w-6 mb-2" />
                    <div className="font-semibold">Folder Name</div>
                    <div className="text-sm text-muted-foreground">Extract from folder names</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('folder_path')}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      sourceType === 'folder_path' && "border-primary bg-primary/5"
                    )}
                  >
                    <FolderTree className="h-6 w-6 mb-2" />
                    <div className="font-semibold">Folder Path</div>
                    <div className="text-sm text-muted-foreground">Extract from full folder path</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('file_metadata')}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      sourceType === 'file_metadata' && "border-primary bg-primary/5"
                    )}
                  >
                    <Database className="h-6 w-6 mb-2" />
                    <div className="font-semibold">File Metadata</div>
                    <div className="text-sm text-muted-foreground">Extract from file properties</div>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Choose Extraction Method */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: How to extract?</CardTitle>
                <CardDescription>Choose how to extract the data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setExtractionMethod('direct')}
                    className={cn(
                      "w-full p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      extractionMethod === 'direct' && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="font-semibold">Use as-is</div>
                    <div className="text-sm text-muted-foreground">Use the entire value without changes</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractionMethod('date')}
                    className={cn(
                      "w-full p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      extractionMethod === 'date' && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="font-semibold">Extract Date</div>
                    <div className="text-sm text-muted-foreground">Find and extract dates automatically</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractionMethod('number')}
                    className={cn(
                      "w-full p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      extractionMethod === 'number' && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="font-semibold">Extract Number</div>
                    <div className="text-sm text-muted-foreground">Find and extract numbers automatically</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtractionMethod('pattern')}
                    className={cn(
                      "w-full p-4 border-2 rounded-lg text-left transition-all hover:bg-muted",
                      extractionMethod === 'pattern' && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="font-semibold">Extract with Pattern</div>
                    <div className="text-sm text-muted-foreground">Use a pattern to find specific text</div>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Configure Pattern */}
          {currentStep === 3 && extractionMethod !== 'direct' && (
            <PatternBuilder
              extractionMethod={extractionMethod as ExtractionMethod}
              pattern={pattern}
              onPatternChange={setPattern}
              patternFlags={patternFlags}
              onPatternFlagsChange={setPatternFlags}
              sampleData={sampleData?.[sourceType as keyof typeof sampleData] || ''}
            />
          )}

          {/* Step 4: Choose Column */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 4: Which column?</CardTitle>
                <CardDescription>Select an existing column or create a new one</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Use existing column</Label>
                  <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or create new</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-column-name">Column Name</Label>
                  <Input
                    id="new-column-name"
                    placeholder="e.g., Client Name, Case Number"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-column-renderer">Display Type</Label>
                  <Select value={newColumnRenderer} onValueChange={(v) => setNewColumnRenderer(v as any)}>
                    <SelectTrigger id="new-column-renderer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="badge">Badge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Preview & Confirm */}
          {currentStep === 5 && (
            <MappingPreview
              sourceType={sourceType as DataSourceType}
              extractionMethod={extractionMethod as ExtractionMethod}
              pattern={pattern}
              sampleData={sampleData}
              columnLabel={selectedColumnId ? columns.find(c => c.id === selectedColumnId)?.label || '' : newColumnName}
            />
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 5
            </span>
            {currentStep < 5 ? (
              <Button onClick={handleNext} disabled={!canProceed}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!canProceed}>
                <Check className="h-4 w-4 mr-2" />
                Create Mapping
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

