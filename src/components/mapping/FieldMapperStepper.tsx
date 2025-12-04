/**
 * Field Mapper Stepper - Dead-simple visual wizard for non-technical users
 * ELITE: Intuitive 5-step process with live preview and validation
 */

import { useState, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { ChevronRight, ChevronLeft, FileText, Folder, FolderTree, Database, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldMapping, DataSourceType, ExtractionMethod } from '@/types/mapping'
import { validatePattern } from '@/types/mapping'
import { addMapping } from '@/services/mappingService'
import { PatternBuilder } from './PatternBuilder'
import { MappingPreview } from './MappingPreview'

interface FieldMapperStepperProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  caseId,
  sampleData,
}: FieldMapperStepperProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [sourceType, setSourceType] = useState<DataSourceType | ''>('')
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod | ''>('')
  const [pattern, setPattern] = useState('')
  const [patternFlags, setPatternFlags] = useState('')
  const [fieldName, setFieldName] = useState('')
  const [attemptedProceedStep3, setAttemptedProceedStep3] = useState(false)

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset all state
      setCurrentStep(1)
      setSourceType('')
      setExtractionMethod('')
      setPattern('')
      setPatternFlags('')
      setFieldName('')
      setAttemptedProceedStep3(false)
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
        return fieldName.trim().length > 0
      case 5:
        return true
      default:
        return false
    }
  }, [currentStep, sourceType, extractionMethod, pattern, fieldName])

  const handleNext = useCallback(() => {
    // Track if user attempted to proceed on step 3
    if (currentStep === 3) {
      setAttemptedProceedStep3(true)
    }
    
    if (canProceed && currentStep < 5) {
      const wasOnStep3 = currentStep === 3
      setCurrentStep((prev) => (prev + 1) as Step)
      // Reset attempted proceed when moving away from step 3
      if (wasOnStep3) {
        setAttemptedProceedStep3(false)
      }
    }
  }, [canProceed, currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
      // Reset attempted proceed when going back
      if (currentStep === 4) {
        setAttemptedProceedStep3(false)
      }
    }
  }, [currentStep])

  const handleFinish = useCallback(() => {
    if (!canProceed) return

    // Generate columnId from field name (slugify)
    const columnId = fieldName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `field_${Date.now()}`

    // Create mapping
    const mapping: FieldMapping = {
      id: `mapping_${Date.now()}`,
      columnId,
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
      description: fieldName.trim() || `Extract from ${sourceType} using ${extractionMethod}`,
    }

    addMapping(mapping, caseId).catch(console.error)
    handleOpenChange(false)
  }, [canProceed, fieldName, sourceType, extractionMethod, pattern, patternFlags, caseId, handleOpenChange])

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
              attemptedProceed={attemptedProceedStep3}
            />
          )}

          {/* Step 4: Name the Field */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 4: Name the Field</CardTitle>
                <CardDescription>Give this extracted field a name (e.g., Client Name, Case Number, Date Received)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    placeholder="e.g., Client Name, Case Number, Date Received"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    autoFocus
                  />
                  <div className="text-xs text-muted-foreground">
                    This name will be used to identify the extracted data. It will appear on workflow cards and in the metadata panel.
                  </div>
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
              columnLabel={fieldName}
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

