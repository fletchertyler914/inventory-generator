import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ReportSectionProps {
  title: string
  children: ReactNode
  className?: string
  editable?: boolean
  content?: string
  onContentChange?: (content: string) => void
}

export function ReportSection({
  title,
  children,
  className,
  editable = false,
  content,
  onContentChange,
}: ReportSectionProps) {
  return (
    <div className={cn("mb-8", className)}>
      <h2 className="text-2xl font-semibold mb-4 border-b border-border pb-2">{title}</h2>
      <div className="prose prose-sm max-w-none">
        {editable && onContentChange ? (
          <div className="min-h-[200px] p-4 border border-border rounded-lg bg-background">
            <p className="text-muted-foreground text-sm">
              Rich text editor will be integrated here
            </p>
            {content && <div dangerouslySetInnerHTML={{ __html: content }} />}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

