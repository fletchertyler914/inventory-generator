import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';

interface TagsCellProps {
  tags: string[] | undefined;
  onTagsChange: (tags: string[]) => void;
}

export function TagsCell({ tags, onTagsChange }: TagsCellProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const currentTags = tags || [];

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !currentTags.includes(trimmed)) {
      onTagsChange([...currentTags, trimmed]);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 min-w-0 flex-wrap">
          {currentTags.length > 0 ? (
            <>
              {currentTags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  {tag}
                </Badge>
              ))}
              {currentTags.length > 2 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  +{currentTags.length - 2}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-2 bg-popover text-popover-foreground dark:bg-popover dark:text-popover-foreground border-border" 
        align="start"
        style={{
          backgroundColor: "hsl(var(--popover))",
          opacity: 1,
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tag..."
              className="h-7 text-xs"
            />
            <Button size="sm" onClick={handleAddTag} className="h-7">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {currentTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 h-6 flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

