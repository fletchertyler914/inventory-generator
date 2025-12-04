import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Label } from "./ui/label"
import { Checkbox } from "./ui/checkbox"
import { Settings, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { useSettingsStore } from "@/store/settingsStore"
import type { SystemFileFilterConfig } from "@/services/settingsService"

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const SYSTEM_FILE_PATTERNS = [
  { id: "DS_Store", label: ".DS_Store (macOS)", description: "macOS Finder metadata files" },
  { id: "Thumbs.db", label: "Thumbs.db (Windows)", description: "Windows thumbnail cache files" },
  { id: "desktop.ini", label: "desktop.ini (Windows)", description: "Windows folder customization files" },
  { id: ".directory", label: ".directory (KDE)", description: "KDE directory metadata files" },
  { id: "._*", label: "._* (macOS resource forks)", description: "macOS resource fork files" },
  { id: "~$*", label: "~$* (Office temp files)", description: "Temporary Microsoft Office files" },
]

export function SettingsDialog({ open: controlledOpen, onOpenChange }: SettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  
  const { theme, setTheme } = useTheme()
  const { systemFileFilter, isLoading, loadSystemFileFilter, saveSystemFileFilter } = useSettingsStore()
  const [localFilter, setLocalFilter] = useState<SystemFileFilterConfig | null>(null)
  
  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSystemFileFilter()
    }
  }, [open, loadSystemFileFilter])
  
  // Sync local state when store updates
  useEffect(() => {
    if (systemFileFilter) {
      setLocalFilter(systemFileFilter)
    }
  }, [systemFileFilter])
  
  const handleClose = () => {
    setOpen(false)
  }
  
  const handleFilterEnabledChange = (enabled: boolean) => {
    if (!localFilter) return
    const updated = { ...localFilter, enabled }
    setLocalFilter(updated)
    saveSystemFileFilter(updated)
  }
  
  const handlePatternToggle = (patternId: string, checked: boolean) => {
    if (!localFilter) return
    const patterns = checked
      ? [...localFilter.patterns, patternId]
      : localFilter.patterns.filter(p => p !== patternId)
    const updated = { ...localFilter, patterns }
    setLocalFilter(updated)
    saveSystemFileFilter(updated)
  }
  
  const isPatternEnabled = (patternId: string) => {
    return localFilter?.patterns.includes(patternId) ?? false
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure application settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Theme Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
                <span className="text-xs">Light</span>
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
                <span className="text-xs">Dark</span>
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-4 w-4" />
                <span className="text-xs">System</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color theme
            </p>
          </div>

          {/* File Import Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">File Import</Label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filter-enabled"
                  checked={localFilter?.enabled ?? true}
                  onCheckedChange={(checked) => handleFilterEnabledChange(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="filter-enabled" className="text-sm font-medium cursor-pointer">
                  Filter system files during import
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Exclude system files from being added to cases
              </p>
              
              {localFilter?.enabled && (
                <div className="ml-6 space-y-2 mt-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Select file types to filter:
                  </Label>
                  {SYSTEM_FILE_PATTERNS.map((pattern) => (
                    <div key={pattern.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`pattern-${pattern.id}`}
                        checked={isPatternEnabled(pattern.id)}
                        onCheckedChange={(checked) => handlePatternToggle(pattern.id, checked === true)}
                        disabled={isLoading}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={`pattern-${pattern.id}`} 
                          className="text-xs cursor-pointer font-normal"
                        >
                          {pattern.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {pattern.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

