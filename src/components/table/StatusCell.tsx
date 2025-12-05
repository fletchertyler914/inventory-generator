import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Button } from "../ui/button"
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
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-xs font-normal gap-1.5 flex-shrink-0",
            "min-w-[100px] max-w-[140px]",
            currentStatus?.color
          )}
        >
          <span className="truncate">{currentStatus?.label || "Unreviewed"}</span>
          <ChevronDown className="h-3 w-3 opacity-50 dark:opacity-70 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 dark:bg-popover dark:border-border/60 dark:text-popover-foreground border-border/50" 
        align="start"
      >
        <div className="space-y-0.5">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => {
                onStatusChange(option.value)
                setOpen(false)
              }}
              variant="ghost"
              className={cn(
                "w-full justify-between h-auto px-2 py-1.5 text-xs",
                status === option.value && "bg-muted/30"
              )}
            >
              <span className={cn("flex items-center gap-2", option.color)}>
                {option.label}
              </span>
              {status === option.value && (
                <Check className="h-3.5 w-3.5 text-foreground dark:text-accent-foreground" />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
