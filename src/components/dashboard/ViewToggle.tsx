'use client'

import { Button } from '@/components/ui/button'
import { Grid3X3, List } from 'lucide-react'
import { useCallback } from 'react'

interface ViewToggleProps {
  viewMode: 'grid' | 'table'
  onViewModeChange: (mode: 'grid' | 'table') => void
  disabled?: boolean
  className?: string
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  disabled = false,
  className = ''
}: ViewToggleProps) {
  const handleGridClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && viewMode !== 'grid') onViewModeChange('grid')
  }, [viewMode, onViewModeChange, disabled])

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && viewMode !== 'table') onViewModeChange('table')
  }, [viewMode, onViewModeChange, disabled])

  return (
    <div
      className={`flex items-center bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-sm p-1 gap-0 ${className}`}
      role="group"
      aria-label="View toggle"
    >
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleGridClick}
        disabled={disabled}
        className={`h-8 px-3 relative z-10 transition-all duration-200 ${viewMode === 'grid'
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
        title="Grid view"
        type="button"
        aria-pressed={viewMode === 'grid'}
        aria-label="Switch to grid view"
      >
        <Grid3X3 className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Button>

      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleTableClick}
        disabled={disabled}
        className={`h-8 px-3 relative z-10 transition-all duration-200 ${viewMode === 'table'
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
        title="Table view"
        type="button"
        aria-pressed={viewMode === 'table'}
        aria-label="Switch to table view"
      >
        <List className="h-4 w-4" />
        <span className="sr-only">Table view</span>
      </Button>
    </div>
  )
}