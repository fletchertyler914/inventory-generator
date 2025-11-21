import * as React from "react"
import { Calendar } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  isValidDateFormat,
  formatDate,
  parseDate,
  getDateErrorMessage,
} from "@/lib/date-utils"

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
  id?: string
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder = "MM/DD/YYYY (e.g., 11/20/2025)",
  className,
  disabled = false,
  error,
  id,
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [localValue, setLocalValue] = React.useState(value)
  const [localError, setLocalError] = React.useState("")
  const internalRef = React.useRef<HTMLInputElement>(null)
  
  // Merge refs - React.forwardRef handles ref forwarding
  // We use internalRef for our own use and forward the ref
  React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement, [])
  
  const inputRef = internalRef

  // Sync local value with prop value
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Validate on blur
  const handleBlur = () => {
    const trimmed = localValue.trim()
    if (trimmed) {
      const errorMsg = getDateErrorMessage(trimmed)
      setLocalError(errorMsg)
      if (!errorMsg && isValidDateFormat(trimmed)) {
        // Normalize the date format (capitalize month)
        const parsed = parseDate(trimmed)
        if (parsed) {
          const normalized = formatDate(parsed)
          onChange(normalized)
          setLocalValue(normalized)
        }
      }
    } else {
      setLocalError("")
      onChange("")
    }
    onBlur?.()
  }

  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    // Clear error while typing
    if (localError) {
      setLocalError("")
    }
    // Update parent immediately for real-time feedback
    onChange(newValue)
  }

  // Handle date picker selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = formatDate(date)
      setLocalValue(formatted)
      setLocalError("")
      onChange(formatted)
      setIsOpen(false)
      // Focus back on input after selection
      setTimeout(() => {
        internalRef.current?.focus()
      }, 0)
    }
  }

  // Parse current value for calendar
  const selectedDate = React.useMemo(() => {
    if (!value || !isValidDateFormat(value)) {
      return undefined
    }
    return parseDate(value) || undefined
  }, [value])

  const displayError = error || localError
  const hasError = !!displayError

  return (
    <div className="relative">
      <div className="relative flex gap-2">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !onKeyDown) {
              e.preventDefault()
              internalRef.current?.blur()
            } else if (onKeyDown) {
              onKeyDown(e)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1",
            hasError && "border-destructive focus-visible:ring-destructive",
            className
          )}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              className={cn(
                "h-9 w-9 flex-shrink-0",
                hasError && "border-destructive"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="sr-only">Open date picker</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="rounded-md"
              captionLayout="dropdown"
              fromYear={1900}
              toYear={2100}
            />
          </PopoverContent>
        </Popover>
      </div>
      {hasError && (
        <p className="mt-1.5 text-xs text-destructive">{displayError}</p>
      )}
    </div>
  )
})

DateInput.displayName = "DateInput"

