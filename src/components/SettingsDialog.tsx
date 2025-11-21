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
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Settings } from "lucide-react"
import { useSettingsStore } from "@/store/settingsStore"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SettingsDialog({ open: controlledOpen, onOpenChange }: SettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  
  const {
    syncPollingEnabled,
    syncPollingInterval,
    setSyncPollingEnabled,
    setSyncPollingInterval,
  } = useSettingsStore()
  
  const [pollingEnabled, setPollingEnabled] = useState(syncPollingEnabled)
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(syncPollingInterval / 1000)
  const [intervalError, setIntervalError] = useState("")

  // Sync local state with store when dialog opens
  useEffect(() => {
    if (open) {
      setPollingEnabled(syncPollingEnabled)
      setPollingIntervalSeconds(syncPollingInterval / 1000)
      setIntervalError("")
    }
  }, [open, syncPollingEnabled, syncPollingInterval])

  const handleSave = () => {
    // Validate interval
    if (pollingIntervalSeconds < 10 || pollingIntervalSeconds > 300) {
      setIntervalError("Interval must be between 10 and 300 seconds")
      return
    }

    setIntervalError("")
    setSyncPollingEnabled(pollingEnabled)
    setSyncPollingInterval(pollingIntervalSeconds * 1000)
    setOpen(false)
  }

  const handleCancel = () => {
    // Reset to store values
    setPollingEnabled(syncPollingEnabled)
    setPollingIntervalSeconds(syncPollingInterval / 1000)
    setIntervalError("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
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
        <div className="space-y-4 py-4">
          {/* Sync Polling Settings */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="polling-enabled"
                checked={pollingEnabled}
                onCheckedChange={(checked) => setPollingEnabled(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1.5">
                <Label
                  htmlFor="polling-enabled"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Enable sync status polling
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically check if the folder is in sync with the inventory by periodically counting files.
                  This helps detect when files are added or removed from the folder.
                </p>
              </div>
            </div>
            
            <div className={cn(
              "space-y-2 pl-9 transition-opacity",
              !pollingEnabled && "opacity-50"
            )}>
              <div className="flex items-center gap-3">
                <Label htmlFor="polling-interval" className="text-sm font-medium whitespace-nowrap">
                  Polling interval (seconds):
                </Label>
                <Input
                  id="polling-interval"
                  type="number"
                  min={10}
                  max={300}
                  step={5}
                  value={pollingIntervalSeconds}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    if (!isNaN(value)) {
                      setPollingIntervalSeconds(value)
                      if (value < 10 || value > 300) {
                        setIntervalError("Interval must be between 10 and 300 seconds")
                      } else {
                        setIntervalError("")
                      }
                    }
                  }}
                  disabled={!pollingEnabled}
                  className={cn(
                    "w-20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]",
                    intervalError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              </div>
              {intervalError && (
                <p className="text-xs text-destructive font-medium">{intervalError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Range: 10-300 seconds. Lower values use more resources.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!intervalError}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

