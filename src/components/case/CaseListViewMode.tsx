import { Grid3x3, List } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface CaseListViewModeProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function CaseListViewMode({ viewMode, onViewModeChange }: CaseListViewModeProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-md border border-border">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className={cn(
          "h-7 px-2",
          viewMode === 'grid' && "shadow-sm"
        )}
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className={cn(
          "h-7 px-2",
          viewMode === 'list' && "shadow-sm"
        )}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}

