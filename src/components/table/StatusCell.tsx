import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { cn } from "@/lib/utils"
import type { FileStatus } from "@/types/inventory"

const statusOptions: { value: FileStatus; label: string; color: string }[] = [
  {
    value: "unreviewed",
    label: "Unreviewed",
    color: "text-muted-foreground",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "text-blue-400",
  },
  {
    value: "reviewed",
    label: "Reviewed",
    color: "text-green-400",
  },
  {
    value: "flagged",
    label: "Flagged",
    color: "text-yellow-400",
  },
  {
    value: "finalized",
    label: "Finalized",
    color: "text-green-500",
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
            "bg-muted/50 hover:bg-muted border border-border/50",
            currentStatus?.color
          )}
        >
          {currentStatus?.label || "Unreviewed"}
          <ChevronDown className="ml-1 h-3 w-3 opacity-50 dark:opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 dark:bg-popover dark:border-border dark:text-popover-foreground" 
        align="start"
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
                "hover:bg-muted/50",
                status === option.value && "bg-muted/30"
              )}
            >
              <span className={cn("flex items-center gap-2", option.color)}>
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
