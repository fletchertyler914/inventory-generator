"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { isValidDateFormat, formatDate, parseDate } from "@/lib/date-utils"

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
  id?: string
  defaultOpen?: boolean
}

export const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      placeholder = "Select date",
      className,
      disabled = false,
      error,
      id,
      defaultOpen = false,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(defaultOpen)
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    
    // Merge refs
    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement, [])

    // Sync open state with defaultOpen prop when it changes
    React.useEffect(() => {
      if (defaultOpen) {
        setOpen(true)
      }
    }, [defaultOpen])

    // Parse current value for calendar
    const selectedDate = React.useMemo(() => {
      if (!value || !isValidDateFormat(value)) {
        return undefined
      }
      return parseDate(value) || undefined
    }, [value])

    // Month state for calendar navigation - always use first day of month
    const getFirstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
    
    const [month, setMonth] = React.useState<Date>(() => {
      if (selectedDate) {
        return getFirstOfMonth(selectedDate)
      }
      return getFirstOfMonth(new Date())
    })

    // Update month when selectedDate changes
    React.useEffect(() => {
      if (selectedDate) {
        setMonth(getFirstOfMonth(selectedDate))
      }
    }, [selectedDate])

    // Reset month when popover opens if no date is selected
    React.useEffect(() => {
      if (open && !selectedDate) {
        setMonth(getFirstOfMonth(new Date()))
      }
    }, [open, selectedDate])

    // Get display text for the button
    const displayText = React.useMemo(() => {
      if (value && isValidDateFormat(value)) {
        const date = parseDate(value)
        if (date) {
          return formatDate(date)
        }
      }
      return placeholder
    }, [value, placeholder])

    // Handle date picker selection
    const handleDateSelect = (date: Date | undefined) => {
      if (date) {
        const formatted = formatDate(date)
        onChange(formatted)
        setOpen(false)
        // Call onBlur to save and close editable cell
        // Use a longer delay to ensure onChange has updated parent state
        setTimeout(() => {
          onBlur?.()
        }, 150)
      } else {
        // If date is cleared, update to empty string
        onChange("")
        setOpen(false)
        setTimeout(() => {
          onBlur?.()
        }, 150)
      }
    }

    const hasError = !!error

    return (
      <div className="relative w-full" data-date-input-wrapper onMouseDown={(e) => e.stopPropagation()}>
        <Popover 
          open={open} 
          onOpenChange={(newOpen) => {
            setOpen(newOpen)
            // When popover closes (user clicked outside), trigger save
            if (!newOpen) {
              setTimeout(() => {
                onBlur?.()
              }, 100)
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              ref={buttonRef}
              type="button"
              id={id || "date-picker"}
              variant="ghost"
              disabled={disabled}
              className={cn(
                "w-full justify-end text-right font-normal h-8 text-xs",
                !value && "text-muted-foreground",
                hasError && "text-destructive",
                className
              )}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
            >
              <span className="truncate flex-1 text-right">{displayText}</span>
              <CalendarIcon className="ml-2 h-3 w-3 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0 bg-popover"
              align="end"
              alignOffset={-8}
              sideOffset={10}
              style={{ backgroundColor: "hsl(var(--popover))", opacity: 1 }}
            >
              <Calendar
              mode="single"
              selected={selectedDate}
                captionLayout="dropdown"
                month={month}
                onMonthChange={(date) => {
                  if (date) {
                    // Normalize to first day of month to ensure consistent state
                    const firstOfMonth = getFirstOfMonth(date)
                    setMonth(firstOfMonth)
                  }
                }}
              onSelect={handleDateSelect}
              fromYear={1900}
              toYear={2100}
            />
          </PopoverContent>
        </Popover>
        {hasError && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

DateInput.displayName = "DateInput"

