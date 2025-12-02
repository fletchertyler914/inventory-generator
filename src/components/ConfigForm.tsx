import { useState, useEffect } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { DateInput } from "./ui/date-input"
import { FileText, Calendar, CheckCircle2 } from "lucide-react"
import { isValidDateFormat } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface ConfigFormProps {
  caseNumber: string
  onCaseNumberChange: (value: string) => void
  onBulkSetDateRcvd: (date: string, indices?: number[]) => void
  selectedIndices: number[]
  totalItems: number
  bulkDateInputRef?: React.RefObject<HTMLButtonElement> | undefined
}

export function ConfigForm({
  caseNumber,
  onCaseNumberChange,
  onBulkSetDateRcvd,
  selectedIndices,
  totalItems,
  bulkDateInputRef,
}: ConfigFormProps) {
  const [bulkDate, setBulkDate] = useState("")
  const [dateError, setDateError] = useState("")
  const [caseNumberError, setCaseNumberError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const hasSelection = selectedIndices.length > 0

  const validateCaseNumber = (value: string): string => {
    if (!value.trim()) {
      return "" // Allow empty case number
    }
    // Basic validation: should contain alphanumeric characters, hyphens, and underscores
    if (!/^[A-Za-z0-9\-_]+$/.test(value.trim())) {
      return "Case number can only contain letters, numbers, hyphens, and underscores"
    }
    return ""
  }

  const handleCaseNumberChange = (value: string) => {
    onCaseNumberChange(value)
    const error = validateCaseNumber(value)
    setCaseNumberError(error)
  }

  const handleBulkSetDate = async () => {
    const trimmed = bulkDate.trim()
    if (!trimmed) {
      setDateError("Please enter a date")
      return
    }

    if (!isValidDateFormat(trimmed)) {
      setDateError("Invalid date format. Use MM/DD/YYYY (e.g., 11/20/2025)")
      return
    }

    setDateError("")
    
    // Note: File change checking for bulk operations would require caseId and fileIds
    // This is handled at a higher level if needed
    onBulkSetDateRcvd(trimmed, hasSelection ? selectedIndices : undefined)
    setBulkDate("")
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  // Reset success message when selection changes
  useEffect(() => {
    if (showSuccess) {
      // Use setTimeout to avoid cascading renders
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, 0)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [selectedIndices, showSuccess])

  const handleDateChange = (value: string) => {
    setBulkDate(value)
    // Clear error when user starts typing
    if (dateError) {
      setDateError("")
    }
  }

  return (
    <div className="space-y-5">
        <div className="space-y-2.5">
        <Label htmlFor="case-number" className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Case Number
          </Label>
          <div className="space-y-1.5">
            <Input
              id="case-number"
              placeholder="e.g., FA-2025-019"
              value={caseNumber}
              onChange={(e) => handleCaseNumberChange(e.target.value)}
              onBlur={() => {
                const error = validateCaseNumber(caseNumber)
                setCaseNumberError(error)
              }}
              className={caseNumberError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {caseNumberError && (
              <p className="text-xs text-destructive">{caseNumberError}</p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="bulk-date" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Bulk Set Date Received
          </Label>
        {hasSelection && (
              <span className="text-xs text-muted-foreground">
                {selectedIndices.length} selected
              </span>
            )}
          </div>
          
          {!hasSelection && totalItems > 0 && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              Apply to all items, or select specific rows in the table first
          </p>
        )}
          
          {totalItems === 0 && (
            <p className="text-xs text-muted-foreground/60 italic">
              No items available. Scan a folder to begin.
          </p>
        )}

          <div className="flex gap-2">
            <div className="flex-1">
          <DateInput
            id="bulk-date"
            ref={bulkDateInputRef}
            value={bulkDate}
            onChange={handleDateChange}
                placeholder="Select date"
            error={dateError}
            disabled={totalItems === 0}
                className="w-full"
          />
            </div>
          <Button 
            onClick={handleBulkSetDate} 
            variant="default"
            disabled={!bulkDate.trim() || totalItems === 0 || !!dateError}
              size="default"
            className={cn(
                "shrink-0 px-4 transition-all duration-200",
              showSuccess && "bg-success hover:bg-success/90"
            )}
          >
            {showSuccess ? (
                <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                  Applied
              </span>
            ) : (
              "Apply"
            )}
          </Button>
          </div>
          
          {showSuccess && (
            <p className="text-xs text-success flex items-center gap-1.5 animate-in fade-in-0">
              <CheckCircle2 className="h-3 w-3" />
              Applied to {hasSelection ? selectedIndices.length : totalItems} item{hasSelection ? (selectedIndices.length !== 1 ? 's' : '') : (totalItems !== 1 ? 's' : '')}
            </p>
          )}
      </div>
    </div>
  )
}
