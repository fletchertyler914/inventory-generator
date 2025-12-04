import { memo } from 'react';
import { FolderOpen, Trash2, Edit2, Clock, FileText, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import type { Case } from '@/types/case';
import { format } from 'date-fns';

interface CaseWithFileCount extends Case {
  fileCount?: number;
  sources?: string[];
}

interface CaseListCardProps {
  case_: CaseWithFileCount;
  currentCaseId?: string | undefined;
  loadingFileCount?: boolean;
  onSelect: (case_: Case) => void;
  onEdit: (case_: Case, e: React.MouseEvent) => void;
  onDelete: (case_: Case, e: React.MouseEvent) => void;
  isRecent?: boolean;
  relativeTime?: string;
  viewMode?: 'grid' | 'list';
}

export const CaseListCard = memo(function CaseListCard({
  case_,
  currentCaseId,
  loadingFileCount,
  onSelect,
  onEdit,
  onDelete,
  isRecent = false,
  relativeTime,
  viewMode = 'grid',
}: CaseListCardProps) {
  const isSelected = currentCaseId === case_.id;

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          "group flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200",
          "border-border/40 dark:border-border/50",
          "hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5",
          "hover:border-primary/60 dark:hover:border-primary/50",
          isSelected && "ring-2 ring-primary border-primary dark:border-primary shadow-md shadow-primary/10 bg-primary/5",
          isRecent && "bg-primary/5 border-primary/20 dark:border-primary/30"
        )}
        onClick={() => onSelect(case_)}
      >
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 dark:border-primary/40 group-hover:bg-primary/20 transition-colors flex-shrink-0">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-base font-semibold truncate group-hover:text-primary transition-colors">
              {case_.name}
            </h3>
            {isRecent && (
              <Badge variant="default" className="text-xs">
                Recent
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {case_.case_id && (
              <span className="font-medium">{case_.case_id}</span>
            )}
            {case_.department && (
              <span>{case_.department}</span>
            )}
            {case_.client && (
              <span>{case_.client}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime || format(new Date(case_.last_opened_at * 1000), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => onEdit(case_, e)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={(e) => onDelete(case_, e)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {loadingFileCount ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">
                  {case_.fileCount !== undefined ? case_.fileCount.toLocaleString() : '—'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "border-border/40 dark:border-border/50 hover:border-primary/60 dark:hover:border-primary/50",
        isSelected && "ring-2 ring-primary border-primary dark:border-primary shadow-lg shadow-primary/10",
        isRecent && "bg-primary/5 border-primary/20 dark:border-primary/30"
      )}
      onClick={() => onSelect(case_)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-primary/10 border border-primary/30 dark:border-primary/40 group-hover:bg-primary/20 transition-colors">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                {case_.name}
              </CardTitle>
              {isRecent && (
                <Badge variant="default" className="text-xs ml-auto">
                  Recent
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-1 line-clamp-2 flex items-start gap-1.5">
              <FolderOpen className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground/60" />
              <span className="truncate text-muted-foreground/70">
                {case_.sources && case_.sources.length > 0
                  ? `${case_.sources.length} source${case_.sources.length !== 1 ? 's' : ''}`
                  : 'No sources'}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {case_.case_id && (
            <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
              {case_.case_id}
            </Badge>
          )}
          {case_.department && (
            <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
              {case_.department}
            </Badge>
          )}
          {case_.client && (
            <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
              {case_.client}
            </Badge>
          )}
          <Badge
            variant={case_.deployment_mode === 'cloud' ? 'default' : 'outline'}
            className="text-xs font-medium px-2 py-0.5"
          >
            {case_.deployment_mode}
          </Badge>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{relativeTime || format(new Date(case_.last_opened_at * 1000), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => onEdit(case_, e)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={(e) => onDelete(case_, e)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {loadingFileCount ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">
                    {case_.fileCount !== undefined ? case_.fileCount.toLocaleString() : '—'}
                  </span>
                  <span className="text-muted-foreground">files</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

