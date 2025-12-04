import { X, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface CaseFilters {
  deploymentMode: ('local' | 'cloud')[];
  departments: string[];
  clients: string[];
}

interface CaseFiltersProps {
  filters: CaseFilters;
  onFiltersChange: (filters: CaseFilters) => void;
  availableDepartments: string[];
  availableClients: string[];
}

export function CaseFilters({
  filters,
  onFiltersChange,
  availableDepartments,
  availableClients,
}: CaseFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const hasActiveFilters =
    filters.deploymentMode.length > 0 ||
    filters.departments.length > 0 ||
    filters.clients.length > 0;

  // Get computed card background color to ensure solid background
  const cardBgColor = useMemo(() => {
    if (typeof window === 'undefined') {
      // Dark mode fallback
      return 'hsl(0, 0%, 10%)';
    }
    try {
      // Try to get the actual computed background color
      const testEl = document.createElement('div');
      testEl.className = 'bg-card';
      testEl.style.display = 'none';
      testEl.style.visibility = 'hidden';
      document.body.appendChild(testEl);
      const computedColor = getComputedStyle(testEl).backgroundColor;
      document.body.removeChild(testEl);
      
      // Check if we got a valid opaque color
      if (computedColor && 
          computedColor !== 'rgba(0, 0, 0, 0)' && 
          computedColor !== 'transparent' &&
          !computedColor.includes('oklch')) {
        // If it's rgba/rgb, ensure it's fully opaque
        if (computedColor.startsWith('rgba')) {
          const rgbaMatch = computedColor.match(/rgba?\(([^)]+)\)/);
          if (rgbaMatch) {
            const parts = rgbaMatch[1].split(',').map(s => s.trim());
            if (parts.length >= 3) {
              return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
            }
          }
        }
        return computedColor;
      }
    } catch (e) {
      console.warn('Failed to compute card color:', e);
    }
    
    // Fallback: check if dark mode
    const isDark = document.documentElement.classList.contains('dark') || 
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (isDark) {
      return 'hsl(0, 0%, 10%)'; // Dark solid background
    } else {
      return 'hsl(0, 0%, 98%)'; // Light solid background
    }
  }, []);

  // Calculate panel position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8, // mt-2 = 8px
        left: rect.left,
      });
    }
  }, [isOpen]);

  const toggleDeploymentMode = (mode: 'local' | 'cloud') => {
    const newModes = filters.deploymentMode.includes(mode)
      ? filters.deploymentMode.filter(m => m !== mode)
      : [...filters.deploymentMode, mode];
    onFiltersChange({ ...filters, deploymentMode: newModes });
  };

  const toggleDepartment = (dept: string) => {
    const newDepts = filters.departments.includes(dept)
      ? filters.departments.filter(d => d !== dept)
      : [...filters.departments, dept];
    onFiltersChange({ ...filters, departments: newDepts });
  };

  const toggleClient = (client: string) => {
    const newClients = filters.clients.includes(client)
      ? filters.clients.filter(c => c !== client)
      : [...filters.clients, client];
    onFiltersChange({ ...filters, clients: newClients });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      deploymentMode: [],
      departments: [],
      clients: [],
    });
  };

  const panelContent = isOpen ? (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setIsOpen(false)}
      />
      <div 
        className="fixed z-50 w-80 p-4 border rounded-lg shadow-lg border-border/50 dark:border-border/60"
        style={{
          top: `${panelPosition.top}px`,
          left: `${panelPosition.left}px`,
          backgroundColor: cardBgColor,
          opacity: 1,
          backdropFilter: 'none',
          isolation: 'isolate',
        } as React.CSSProperties}
      >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Filter Cases</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Deployment Mode */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Deployment Mode
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={filters.deploymentMode.includes('local') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDeploymentMode('local')}
                    className="flex-1"
                  >
                    Local
                  </Button>
                  <Button
                    variant={filters.deploymentMode.includes('cloud') ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDeploymentMode('cloud')}
                    className="flex-1"
                  >
                    Cloud
                  </Button>
                </div>
              </div>

              {/* Departments */}
              {availableDepartments.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Department
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableDepartments.map(dept => (
                      <Badge
                        key={dept}
                        variant={filters.departments.includes(dept) ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleDepartment(dept)}
                      >
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Clients */}
              {availableClients.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Client
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableClients.map(client => (
                      <Badge
                        key={client}
                        variant={filters.clients.includes(client) ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleClient(client)}
                      >
                        {client}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
    </>
  ) : null;

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative",
          hasActiveFilters && "border-primary/50 bg-primary/5"
        )}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {hasActiveFilters && (
          <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
            {filters.deploymentMode.length + filters.departments.length + filters.clients.length}
          </span>
        )}
      </Button>

      {typeof window !== 'undefined' && panelContent && createPortal(panelContent, document.body)}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.deploymentMode.map(mode => (
            <Badge
              key={mode}
              variant="secondary"
              className="text-xs"
            >
              {mode}
              <button
                onClick={() => toggleDeploymentMode(mode)}
                className="ml-1.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.departments.map(dept => (
            <Badge
              key={dept}
              variant="secondary"
              className="text-xs"
            >
              {dept}
              <button
                onClick={() => toggleDepartment(dept)}
                className="ml-1.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.clients.map(client => (
            <Badge
              key={client}
              variant="secondary"
              className="text-xs"
            >
              {client}
              <button
                onClick={() => toggleClient(client)}
                className="ml-1.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

