import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { cn } from "@/lib/utils"
import type { FileStatus } from "@/types/inventory"

const statusOptions: { value: FileStatus; label: string; color: string }[] = [
  {
    value: "unreviewed",
    label: "Unreviewed",
    color: "bg-muted text-muted-foreground border border-border",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-info/30 text-info font-medium border border-info/70 dark:bg-info/35 dark:text-info dark:border-info/80",
  },
  {
    value: "reviewed",
    label: "Reviewed",
    color: "bg-success/30 text-success font-medium border border-success/70 dark:bg-success/35 dark:text-success dark:border-success/80",
  },
  {
    value: "flagged",
    label: "Flagged",
    color: "bg-warning/30 text-warning font-medium border border-warning/70 dark:bg-warning/35 dark:text-warning dark:border-warning/80",
  },
  {
    value: "finalized",
    label: "Finalized",
    color: "bg-success/35 text-success font-semibold border border-success/80 dark:bg-success/40 dark:text-success dark:border-success/90",
  },
]

interface StatusCellProps {
  status: FileStatus | undefined
  onStatusChange: (status: FileStatus) => void
}

export function StatusCell({ status, onStatusChange }: StatusCellProps) {
  const [open, setOpen] = useState(false)
  const currentStatus = statusOptions.find((opt) => opt.value === (status || "unreviewed"))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center gap-2 h-7 px-3 text-xs font-normal rounded-md transition-all",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            currentStatus?.color,
            "hover:opacity-90"
          )}
        >
          {currentStatus?.label || "Unreviewed"}
          <ChevronDown className="ml-1 h-3 w-3 opacity-50 dark:opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 dark:bg-popover dark:border-border dark:text-popover-foreground" 
        align="start"
        style={{ backgroundColor: "hsl(var(--popover))", opacity: 1 }}
      >
        <div className="space-y-0.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onStatusChange(option.value)
                setOpen(false)
              }}
              className={cn(
                "w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-xs cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "dark:hover:bg-accent/80 dark:hover:text-accent-foreground",
                status === option.value &&
                  "bg-accent text-accent-foreground dark:bg-accent/60 dark:text-accent-foreground"
              )}
            >
              <span className={cn("flex items-center gap-2 font-medium", option.color)}>
                {option.label}
              </span>
              {status === option.value && (
                <Check className="h-3.5 w-3.5 text-foreground dark:text-accent-foreground" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
