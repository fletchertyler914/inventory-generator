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

// Memoize helper function outside component
const getFirstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

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

const DateInputComponent = React.forwardRef<HTMLButtonElement, DateInputProps>(
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
    const onBlurRef = React.useRef(onBlur)
    const onChangeRef = React.useRef(onChange)
    const prevDefaultOpenRef = React.useRef(defaultOpen)
    
    // Merge refs
    React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement, [])
  
    // Keep refs in sync
    React.useEffect(() => {
      onBlurRef.current = onBlur
      onChangeRef.current = onChange
    }, [onBlur, onChange])

    // Sync open state with defaultOpen prop when it changes from false to true
  React.useEffect(() => {
      if (defaultOpen && !prevDefaultOpenRef.current) {
        setOpen(true)
        }
      prevDefaultOpenRef.current = defaultOpen
    }, [defaultOpen])

  // Parse current value for calendar
  const selectedDate = React.useMemo(() => {
    if (!value || !isValidDateFormat(value)) {
      return undefined
    }
    return parseDate(value) || undefined
  }, [value])

    // Consolidate month state management into single effect
    const [month, setMonth] = React.useState<Date>(() => {
      if (selectedDate) {
        return getFirstOfMonth(selectedDate)
      }
      return getFirstOfMonth(new Date())
    })

    // Consolidated month state effect
    React.useEffect(() => {
      if (open && !selectedDate) {
        // Reset to current month when popover opens with no date
        setMonth(getFirstOfMonth(new Date()))
      } else if (selectedDate) {
        // Update month when selectedDate changes
        setMonth(getFirstOfMonth(selectedDate))
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

    // Handle date picker selection - optimized with refs and requestAnimationFrame
    const handleDateSelect = React.useCallback((date: Date | undefined) => {
      if (date) {
        const formatted = formatDate(date)
        onChangeRef.current(formatted)
        setOpen(false)
        // Use requestAnimationFrame for immediate execution
        requestAnimationFrame(() => {
          onBlurRef.current?.()
        })
      } else {
        onChangeRef.current("")
        setOpen(false)
        requestAnimationFrame(() => {
          onBlurRef.current?.()
        })
      }
    }, [])

    const hasError = !!error

  return (
      <div className="relative w-full" data-date-input-wrapper onMouseDown={(e) => e.stopPropagation()}>
        <Popover 
          open={open} 
          onOpenChange={(newOpen) => {
            setOpen(newOpen)
            // When popover closes (user clicked outside), trigger save
            if (!newOpen) {
              requestAnimationFrame(() => {
                onBlurRef.current?.()
              })
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              ref={buttonRef}
              type="button"
              id={id || "date-picker"}
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal h-9 text-xs",
                !value && "text-muted-foreground",
                hasError && "border-destructive text-destructive focus-visible:ring-destructive",
                className
              )}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
            >
              <CalendarIcon className="mr-2 h-3 w-3 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{displayText}</span>
            </Button>
          </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0 bg-popover"
              align="end"
              alignOffset={-8}
              sideOffset={10}
            >
              <Calendar
              mode="single"
              selected={selectedDate}
                captionLayout="dropdown"
                month={month}
                onMonthChange={React.useCallback((date: Date | undefined) => {
                  if (date) {
                    setMonth(getFirstOfMonth(date))
                  }
                }, [])}
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

DateInputComponent.displayName = "DateInput"

// Memoize component
export const DateInput = React.memo(DateInputComponent)

