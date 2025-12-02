import { useState, useEffect, useRef, useCallback, memo } from "react"
import { Input } from "../ui/input"
import { DateInput } from "../ui/date-input"
import { Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { isValidDateFormat } from "@/lib/date-utils"

interface EditableCellProps {
  value: string | number
  onSave: (value: string) => void
  placeholder?: string
  type?: "text" | "number" | "date"
  className?: string
}

function EditableCellComponent({
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
  // Use refs for stable callbacks to avoid effect re-registration
  const editValueRef = useRef(editValue)
  const onSaveRef = useRef(onSave)
  const typeRef = useRef(type)
  const setDateErrorRef = useRef(setDateError)

  // Keep refs in sync with props/state
  useEffect(() => {
    onSaveRef.current = onSave
    typeRef.current = type
    setDateErrorRef.current = setDateError
  }, [onSave, type])

  // Update editValueRef directly when setEditValue is called
  const setEditValueWithRef = useCallback((value: string) => {
    editValueRef.current = value
    setEditValue(value)
  }, [])

  // Use ref-based handler to avoid dependency array issues
  const handleSaveRef = useRef<() => void>()
  
  // Update ref in effect to avoid React Compiler error
  useEffect(() => {
    handleSaveRef.current = () => {
      const currentValue = editValueRef.current
      if (typeRef.current === "date" && currentValue.trim()) {
        // Validate date before saving
        if (!isValidDateFormat(currentValue.trim())) {
          setDateErrorRef.current("Invalid date format. Use MM/DD/YYYY (e.g., 11/20/2025)")
          return
        }
      }
      setDateErrorRef.current("")
      onSaveRef.current(currentValue)
      setIsEditing(false)
    }
  })

  const handleSave = useCallback(() => {
    handleSaveRef.current?.()
  }, [])

  useEffect(() => {
    if (isEditing && type !== "date" && inputRef.current) {
      // For text/number inputs, focus immediately using requestAnimationFrame
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          // Set cursor to end of input
          const length = inputRef.current.value.length
          inputRef.current.setSelectionRange(length, length)
        }
      })
    }
  }, [isEditing, type])

  // Handle date blur with validation - define before useEffect that uses it
  const handleDateBlur = useCallback(() => {
    // Use requestAnimationFrame for immediate execution with ref value
    requestAnimationFrame(() => {
      if (typeRef.current === "date") {
        const currentValue = editValueRef.current.trim()
        if (currentValue) {
          if (!isValidDateFormat(currentValue)) {
            setDateErrorRef.current("Invalid date format. Use MM/DD/YYYY (e.g., 11/20/2025)")
            return
          } else {
            setDateErrorRef.current("")
            onSaveRef.current(currentValue)
            setIsEditing(false)
          }
        } else {
          setDateErrorRef.current("")
          onSaveRef.current("")
          setIsEditing(false)
        }
      }
    })
  }, [])

  // Handle click outside to blur and save - optimized with refs
  useEffect(() => {
    if (!isEditing) return

    // Cache popover selectors to avoid repeated DOM queries
    const popoverSelectors = [
      '[role="dialog"]',
      "[data-radix-portal]",
      "[data-radix-popper-content-wrapper]",
      "[data-radix-popover-content]",
      '[data-slot="popover-content"]',
      'button[aria-label*="calendar" i]',
      'button[aria-label*="date" i]',
      '[id*="date-picker"]',
    ]

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target || !containerRef.current) return

      const targetElement = target as Element

      // Simplified popover detection
      const isPopover = popoverSelectors.some((selector) => targetElement?.closest?.(selector))

      // Check if clicking on the date picker button or its container
      if (typeRef.current === "date" && containerRef.current?.contains(target)) {
        const isDatePickerButton =
          targetElement?.tagName === "BUTTON" ||
          targetElement?.closest?.("button") ||
          targetElement?.closest?.("[data-date-input-wrapper]")

        if (isDatePickerButton) {
          return
        }
      }

      // If clicking outside container and not on popover, handle save
      if (!containerRef.current.contains(target) && !isPopover) {
        if (typeRef.current === "date") {
          // For date fields, check if popover is open
          const popoverContent = document.querySelector('[data-slot="popover-content"]')
          if (popoverContent) {
            const inputElement = containerRef.current?.querySelector(
              "input"
            ) as HTMLInputElement | null
            if (inputElement) {
              inputElement.blur()
            }
          } else {
            // Popover already closed, save directly
            handleDateBlur()
          }
        } else {
          // Save directly for non-date fields
          handleSaveRef.current?.()
        }
      }
    }

    const handleFocusChange = () => {
      const activeElement = document.activeElement
      if (
        activeElement &&
        containerRef.current &&
        !containerRef.current.contains(activeElement) &&
        isEditing
      ) {
        if (typeRef.current !== "date") {
          handleSaveRef.current?.()
        }
      }
    }

    // Use requestAnimationFrame instead of setTimeout for immediate registration
    const rafId = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClickOutside, true)
      document.addEventListener("touchstart", handleClickOutside, true)
      document.addEventListener("focusin", handleFocusChange, true)
    })

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener("mousedown", handleClickOutside, true)
      document.removeEventListener("touchstart", handleClickOutside, true)
      document.removeEventListener("focusin", handleFocusChange, true)
    }
  }, [isEditing, handleDateBlur])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditValue(value.toString())
    setDateError("")
    // Don't prevent default - let the click complete naturally
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue("")
    setDateError("")
  }

  const handleDateChange = useCallback(
    (newValue: string) => {
      setEditValueWithRef(newValue)
      // Clear error when user starts typing
      if (dateError) {
        setDateError("")
      }
    },
    [dateError, setEditValueWithRef]
  )

  const handleBlur = useCallback(() => {
    // Auto-save on blur for non-date fields
    // Use requestAnimationFrame for immediate execution
    requestAnimationFrame(() => {
      const activeElement = document.activeElement
      const isMovingToContainer = activeElement && containerRef.current?.contains(activeElement)

      if (typeRef.current !== "date" && isEditing && !isMovingToContainer) {
        handleSaveRef.current?.()
      }
    })
  }, [isEditing])

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
          className={cn("flex items-center gap-1.5 z-[100] relative w-full", className)}
          style={{ zIndex: 100, position: "relative" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex-1 w-full z-[100] bg-background">
            <DateInput
              value={editValue}
              onChange={handleDateChange}
              onBlur={handleDateBlur}
              placeholder={placeholder}
              error={dateError}
              className="h-8 text-xs"
              defaultOpen={isEditing}
            />
          </div>
        </div>
      )
    }

    // For notes field, constrain to prevent overflow; for other fields, allow expansion
    const isNotesField = className?.includes("notes") || false

    return (
      <div
        ref={containerRef}
        className={cn(
          "flex items-center gap-1.5 z-[100] relative",
          isNotesField ? "w-full min-w-0" : "w-auto min-w-full",
          className
        )}
        style={{ zIndex: 100, position: "relative" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "z-[100] bg-background",
            isNotesField ? "flex-1 w-full min-w-0" : "w-auto min-w-[200px]"
          )}
        >
          <Input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValueWithRef(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={(e) => e.stopPropagation()}
            className={cn("h-8 text-xs", isNotesField ? "w-full min-w-0" : "w-auto min-w-[200px]")}
            title={editValue}
          />
        </div>
      </div>
    )
  }

  const displayValue = value ? String(value) : ""
  const isEmpty = !displayValue

  return (
    <div
      onClick={handleClick}
      data-editable-cell
      className={cn(
        "group relative flex items-center gap-1 cursor-pointer rounded px-2 py-1 -mx-2 -my-1 transition-colors duration-150 min-h-[24px] min-w-0",
        "hover:bg-muted/40",
        isEmpty && "text-muted-foreground",
        className
      )}
      title={
        isEmpty
          ? "Click to edit (Enter to save, Esc to cancel)"
          : `${displayValue} - Click to edit (Enter to save, Esc to cancel)`
      }
    >
      <span className="text-xs truncate flex-1 min-w-0" title={displayValue}>
        {isEmpty ? placeholder : displayValue}
      </span>
      {isEmpty && (
        <Edit2 className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0" />
      )}
    </div>
  )
}

// Memoize component with shallow prop comparison
export const EditableCell = memo(EditableCellComponent, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.type === nextProps.type &&
    prevProps.className === nextProps.className
  )
})
