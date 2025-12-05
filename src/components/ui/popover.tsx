"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  style,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  // Get computed popover background color
  const popoverBgColor = useMemo(() => {
    if (typeof window === "undefined") return "#1a1a1a"
    try {
      // Create a temporary element to get the computed color
      const testEl = document.createElement("div")
      testEl.className = "bg-popover"
      testEl.style.display = "none"
      document.body.appendChild(testEl)
      const computedColor = getComputedStyle(testEl).backgroundColor
      document.body.removeChild(testEl)
      // If we got a valid color (not transparent), use it
      if (
        computedColor &&
        computedColor !== "rgba(0, 0, 0, 0)" &&
        computedColor !== "transparent"
      ) {
        return computedColor
      }
    } catch (e) {
      console.warn("Failed to compute popover color:", e)
    }
    // Fallback: use the oklch value directly
    const root = document.documentElement
    const popoverValue = getComputedStyle(root).getPropertyValue("--popover").trim()
    if (popoverValue) {
      return popoverValue
    }
    // Final fallback for dark mode
    return "#1a1a1a"
  }, [])

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground dark:bg-popover dark:text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[9999] w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          "border-border/50 dark:border-border/60",
          className
        )}
        style={{
          backgroundColor: popoverBgColor,
          opacity: 1,
          zIndex: 9999,
          backdropFilter: "none",
          pointerEvents: "auto",
          ...style,
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
