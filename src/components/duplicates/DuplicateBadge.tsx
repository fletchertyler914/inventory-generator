import { cn } from '@/lib/utils';
import { getDuplicateGroupColor } from '@/lib/duplicate-color-palette';
import { useTheme } from '@/hooks/useTheme';

interface DuplicateBadgeProps {
  groupId?: string;
  count: number;
  resolved?: boolean;
  onClick?: () => void;
  className?: string;
  /**
   * Visual encoding style
   * - 'dot': Small filled circle (default, minimal space)
   * - 'ring': Hollow circle with colored border (more visible)
   */
  variant?: 'dot' | 'ring';
}

/**
 * ELITE: Duplicate group indicator using scientifically-designed color palette
 * 
 * Features:
 * - Perceptually uniform colors (equidistant in CIELAB space)
 * - Colorblind-safe (distinguishable in all forms of colorblindness)
 * - Consistent mapping (same group = same color)
 * - Minimal space usage (2-3px indicator)
 * - High contrast (WCAG AA compliant)
 * 
 * Visual encoding options:
 * - 'dot': Small filled circle (2px) - minimal, unobtrusive
 * - 'ring': Hollow circle with border (2.5px) - more visible, better for accessibility
 */
export function DuplicateBadge({ 
  groupId, 
  count, 
  resolved = false, 
  onClick, 
  className,
  variant = 'dot',
}: DuplicateBadgeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  if (count === 0) {
    return null;
  }

  const color = getDuplicateGroupColor(groupId, isDark);

  if (variant === 'ring') {
    // Ring variant: hollow circle with colored border (more visible, better accessibility)
    return (
      <div
        className={cn(
          'h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all',
          'border-2 flex items-center justify-center',
          resolved ? 'opacity-50' : 'opacity-100',
          color.border,
          onClick && 'cursor-pointer hover:opacity-80 hover:scale-110',
          className
        )}
        onClick={onClick}
        title={`${count} duplicate${count !== 1 ? 's' : ''} (group: ${color.name})`}
        aria-label={`${count} duplicate${count !== 1 ? 's' : ''}`}
      >
        {/* Optional: tiny inner dot for extra visibility */}
        <div className={cn('h-1 w-1 rounded-full', color.bg, resolved && 'opacity-50')} />
      </div>
    );
  }

  // Dot variant: small filled circle (default, minimal space)
  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full flex-shrink-0 transition-all',
        resolved ? 'opacity-50' : 'opacity-100',
        color.bg,
        onClick && 'cursor-pointer hover:opacity-80 hover:scale-125',
        className
      )}
      onClick={onClick}
      title={`${count} duplicate${count !== 1 ? 's' : ''} (group: ${color.name})`}
      aria-label={`${count} duplicate${count !== 1 ? 's' : ''}`}
    />
  );
}

