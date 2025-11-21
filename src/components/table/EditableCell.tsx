import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { DateInput } from "../ui/date-input"
import { Check, X, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { isValidDateFormat } from "@/lib/date-utils"

interface EditableCellProps {
  value: string | number
  onSave: (value: string) => void
  placeholder?: string
  type?: "text" | "number" | "date"
  className?: string
}

export function EditableCell({
  value,
  onSave,
  placeholder = "—",
  type = "text",
  className,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [dateError, setDateError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSave = useCallback(() => {
    if (type === "date" && editValue.trim()) {
      // Validate date before saving
      if (!isValidDateFormat(editValue.trim())) {
        setDateError("Invalid date format. Use MM/DD/YYYY (e.g., 11/20/2025)")
        return
      }
    }
    setDateError("")
    onSave(editValue)
    setIsEditing(false)
  }, [type, editValue, onSave])

  useEffect(() => {
    if (isEditing && type !== "date" && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing, type])

  // Handle click outside to blur and save
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target || !containerRef.current) return
      
      // Check if click is outside our container
      // Also check if it's a popover element (date picker) - Radix UI renders in portal
      const targetElement = target as Element
      const isPopover = targetElement?.closest?.('[role="dialog"]') || 
                        targetElement?.closest?.('[data-radix-portal]') ||
                        targetElement?.closest?.('[data-radix-popper-content-wrapper]') ||
                        targetElement?.closest?.('[data-radix-popover-content]') ||
                        // Check if clicking on calendar or popover trigger
                        targetElement?.closest?.('button[aria-label*="calendar" i]') ||
                        targetElement?.closest?.('button[aria-label*="date" i]')
      
      if (!containerRef.current.contains(target) && !isPopover) {
        // For date fields, use a delay to allow DateInput's onBlur to fire first
        // This ensures the value from calendar selection is properly saved
        if (type === "date") {
          // Longer delay for date fields to ensure calendar selection completes
          setTimeout(() => {
            // Use current editValue, which should be updated by DateInput's onChange
            if (editValue.trim() && isValidDateFormat(editValue.trim())) {
              setDateError("")
              onSave(editValue)
              setIsEditing(false)
            } else if (!editValue.trim()) {
              // Allow empty dates
              onSave("")
              setIsEditing(false)
            }
          }, 250)
        } else {
          // Save directly for non-date fields
          handleSave()
        }
      }
    }

    // Also handle when focus moves away
    const handleFocusChange = () => {
      // Check if focus moved outside our container
      const activeElement = document.activeElement
      if (
        activeElement &&
        containerRef.current &&
        !containerRef.current.contains(activeElement) &&
        isEditing
      ) {
        // For date fields, let the DateInput's onBlur handle saving
        // For other fields, save immediately
        if (type !== "date") {
          handleSave()
        }
      }
    }

    // Use a small delay to avoid immediate trigger when clicking to edit
    const timeoutId = setTimeout(() => {
      // Use capture phase to catch events before they bubble
      document.addEventListener("mousedown", handleClickOutside, true)
      document.addEventListener("touchstart", handleClickOutside, true)
      // Also listen for focus changes
      document.addEventListener("focusin", handleFocusChange, true)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside, true)
      document.removeEventListener("touchstart", handleClickOutside, true)
      document.removeEventListener("focusin", handleFocusChange, true)
    }
  }, [isEditing, type, handleSave, editValue, onSave, setDateError, isValidDateFormat])

  const handleClick = () => {
    setIsEditing(true)
    setEditValue(value.toString())
    setDateError("")
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue("")
    setDateError("")
  }

  const handleDateChange = useCallback((newValue: string) => {
    setEditValue(newValue)
    // Clear error when user starts typing
    if (dateError) {
      setDateError("")
    }
  }, [dateError])

  const handleDateBlur = useCallback(() => {
    // Validate on blur for date fields
    // Use a small delay to ensure the value from DateInput is properly set
    setTimeout(() => {
      if (type === "date") {
        if (editValue.trim()) {
          if (!isValidDateFormat(editValue.trim())) {
            setDateError("Invalid date format. Use MM/DD/YYYY (e.g., 11/20/2025)")
          } else {
            setDateError("")
            onSave(editValue)
            setIsEditing(false)
          }
        } else {
          // Allow empty dates
          onSave("")
          setIsEditing(false)
        }
      }
    }, 100)
  }, [type, editValue, onSave])
  
  const handleBlur = () => {
    // Auto-save on blur for non-date fields
    // Use setTimeout to check after focus has actually moved
    setTimeout(() => {
      // Check if focus is moving to another element within our container (like a button)
      const activeElement = document.activeElement
      const isMovingToContainer = activeElement && containerRef.current?.contains(activeElement)
      
      if (type !== "date" && isEditing && !isMovingToContainer) {
        // Focus is moving outside the container - save immediately
        handleSave()
      }
    }, 10)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Allow Tab to save and move to next cell
      e.preventDefault()
      handleSave()
      // Focus will move to next element naturally
    } else if (e.key === "Tab" && e.shiftKey) {
      // Allow Shift+Tab to save and move to previous cell
      e.preventDefault()
      handleSave()
      // Focus will move to previous element naturally
    }
    // Arrow keys are handled by default input behavior
  }

  if (isEditing) {
    if (type === "date") {
      return (
        <div 
          ref={containerRef}
          className={cn("flex items-start gap-1 z-50 relative", className)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex-1 min-w-[200px] max-w-[400px]">
            <DateInput
              value={editValue}
              onChange={handleDateChange}
              onBlur={handleDateBlur}
              placeholder={placeholder}
              error={dateError}
              className="h-8 text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleSave()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            aria-label="Save"
            disabled={!!dateError}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleCancel()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }

    return (
      <div 
        ref={containerRef}
        className={cn("flex items-center gap-1 z-50 relative", className)}
      >
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={(e) => e.stopPropagation()}
          className="h-8 text-xs w-full min-w-[200px] max-w-[400px]"
          title={editValue}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleSave()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleCancel()
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  const displayValue = value ? String(value) : ""
  const isEmpty = !displayValue

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex items-center gap-1 cursor-pointer rounded px-2 py-1 -mx-2 -my-1 transition-colors duration-150 min-h-[24px]",
        "hover:bg-muted/40",
        isEmpty && "text-muted-foreground",
        className
      )}
      title={isEmpty ? "Click to edit (Enter to save, Esc to cancel)" : `${displayValue} - Click to edit (Enter to save, Esc to cancel)`}
    >
      <span className="text-xs truncate flex-1" title={displayValue}>
        {isEmpty ? placeholder : displayValue}
      </span>
      {isEmpty && (
        <Edit2 className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0" />
      )}
    </div>
  )
}
