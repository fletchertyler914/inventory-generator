import { Grid3x3, List } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface CaseListViewModeProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function CaseListViewMode({ viewMode, onViewModeChange }: CaseListViewModeProps) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md border border-border/40 dark:border-border/50 h-10">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        onClick={() => onViewModeChange('grid')}
        className={cn(
          "h-9 w-9 p-0 flex-shrink-0",
          viewMode === 'grid' && "shadow-sm"
        )}
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        onClick={() => onViewModeChange('list')}
        className={cn(
          "h-9 w-9 p-0 flex-shrink-0",
          viewMode === 'list' && "shadow-sm"
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}

