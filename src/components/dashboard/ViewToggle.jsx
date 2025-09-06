'use client'

import { Button } from '@/components/ui/button'
import { Grid3X3, List } from 'lucide-react'

export function ViewToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="flex items-center rounded-lg glass-card p-1">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className={`h-8 px-3 ${
          viewMode === 'grid' 
            ? 'bg-primary text-primary-foreground shadow-sm' 
            : 'hover:bg-muted/50'
        }`}
        title="Grid view"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('table')}
        className={`h-8 px-3 ${
          viewMode === 'table' 
            ? 'bg-primary text-primary-foreground shadow-sm' 
            : 'hover:bg-muted/50'
        }`}
        title="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
}