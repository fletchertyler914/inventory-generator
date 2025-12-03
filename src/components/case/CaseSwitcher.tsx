import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, FolderOpen, Check } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { caseService } from '@/services/caseService';
import type { Case } from '@/types/case';
import { format } from 'date-fns';

interface CaseSwitcherProps {
  currentCaseId?: string | undefined;
  onSelectCase: (case_: Case) => void;
  onCreateCase?: (() => void) | undefined;
}

export function CaseSwitcher({ currentCaseId, onSelectCase, onCreateCase }: CaseSwitcherProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const loadedCases = await caseService.listCases();
      setCases(loadedCases);
      
      if (currentCaseId) {
        const found = loadedCases.find(c => c.id === currentCaseId);
        if (found) {
          setCurrentCase(found);
        } else {
          // Try to load the case
          try {
            const case_ = await caseService.getCase(currentCaseId);
            setCurrentCase(case_);
          } catch {
            setCurrentCase(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCaseId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal",
            !currentCase && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {currentCase ? currentCase.name : 'Select a case...'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 bg-popover text-popover-foreground dark:bg-popover dark:text-popover-foreground border-border" 
        align="start"
      >
        <div className="flex flex-col">
          {onCreateCase && (
            <div className="p-2 border-b border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onCreateCase();
                  setOpen(false);
                }}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Create New Case
              </Button>
            </div>
          )}
          <ScrollArea className="max-h-[300px]">
            <div className="p-2">
              {loading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Loading cases...
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No cases yet
                </div>
              ) : (
                <div className="space-y-1">
                  {cases.map((case_) => (
                    <button
                      key={case_.id}
                      onClick={() => {
                        onSelectCase(case_);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors",
                        "hover:bg-muted",
                        currentCaseId === case_.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{case_.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {format(new Date(case_.last_opened_at * 1000), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      {currentCaseId === case_.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

