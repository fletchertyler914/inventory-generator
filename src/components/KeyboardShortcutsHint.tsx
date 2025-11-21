import { Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

interface KeyboardShortcutsHintProps {
  className?: string
}

// Detect if running on macOS
function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false
  
  // Try modern API first (userAgentData is experimental and may not be in types)
  const nav = navigator as Navigator & { userAgentData?: { platform: string } }
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos"
  }
  
  // Fallback to userAgent
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
    return true
  }
  
  // Fallback to platform
  const platform = navigator.platform?.toUpperCase() || ""
  return platform.indexOf("MAC") >= 0
}

export function KeyboardShortcutsHint({ className }: KeyboardShortcutsHintProps) {
  const isMac = isMacOS()
  const modifier = isMac ? "⌘" : "Ctrl"

  const shortcuts = [
    { keys: `${modifier} + S`, action: "Create Inventory" },
    { keys: `${modifier} + O`, action: "Load Inventory" },
    { keys: `${modifier} + A`, action: "Select All" },
    { keys: `${modifier} + D`, action: "Focus Date Input" },
    { keys: "Esc", action: "Clear Selection" },
  ]

  return (
    <div className={cn("text-xs text-muted-foreground space-y-1", className)}>
      <div className="flex items-center gap-1.5 mb-2">
        <Keyboard className="h-3 w-3" />
        <span className="font-semibold">Keyboard Shortcuts</span>
      </div>
      <div className="space-y-1">
        {shortcuts.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground/80">{shortcut.action}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded">
              {shortcut.keys}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

