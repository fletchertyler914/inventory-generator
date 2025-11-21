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

  const handleBulkSetDate = () => {
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
    onBulkSetDateRcvd(trimmed, hasSelection ? selectedIndices : undefined)
    setBulkDate("")
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  // Reset success message when selection changes
  useEffect(() => {
    if (showSuccess) {
      setShowSuccess(false)
    }
  }, [selectedIndices])

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
        <div className="space-y-2.5">
        <Label htmlFor="bulk-date" className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Bulk Set Date Rcvd
          </Label>
        {hasSelection && (
          <p className="text-xs text-muted-foreground">
            {selectedIndices.length} of {totalItems} item{totalItems !== 1 ? 's' : ''} selected
          </p>
        )}
        {!hasSelection && totalItems > 0 && (
          <p className="text-xs text-muted-foreground">
            Select rows in the table to apply to specific items, or leave unselected to apply to all
          </p>
        )}
        <div className="space-y-2">
          <DateInput
            id="bulk-date"
            ref={bulkDateInputRef}
            value={bulkDate}
            onChange={handleDateChange}
            placeholder="Select date"
            error={dateError}
            disabled={totalItems === 0}
          />
          <Button 
            onClick={handleBulkSetDate} 
            variant="default"
            disabled={!bulkDate.trim() || totalItems === 0 || !!dateError}
            size="sm"
            className={cn(
              "w-full transition-all duration-200",
              showSuccess && "bg-green-600 hover:bg-green-700"
            )}
          >
            {showSuccess ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Applied!
              </span>
            ) : (
              "Apply"
            )}
          </Button>
          {showSuccess && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              Date applied to {hasSelection ? selectedIndices.length : totalItems} item{hasSelection ? (selectedIndices.length !== 1 ? 's' : '') : (totalItems !== 1 ? 's' : '')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
