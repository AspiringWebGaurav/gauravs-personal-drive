'use client'

import { Button } from '@/components/ui/button'
import { Grid3X3, List, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'

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
  const [isChanging, setIsChanging] = useState(false)

  const handleViewChange = useCallback(async (newMode: 'grid' | 'table') => {
    if (disabled || isChanging || newMode === viewMode) return

    try {
      setIsChanging(true)
      console.log('ViewToggle: Changing from', viewMode, 'to', newMode)
      
      // Add a small delay to ensure state updates properly
      await new Promise(resolve => setTimeout(resolve, 50))
      onViewModeChange(newMode)
      
    } catch (error) {
      console.error('ViewToggle: Error changing view mode:', error)
    } finally {
      setIsChanging(false)
    }
  }, [viewMode, onViewModeChange, disabled, isChanging])

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleViewChange('grid')
  }, [handleViewChange])

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleViewChange('table')
  }, [handleViewChange])

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
        disabled={disabled || isChanging}
        className={`h-8 px-3 relative z-10 transition-all duration-200 ${
          viewMode === 'grid' 
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
        title="Grid view"
        type="button"
        aria-pressed={viewMode === 'grid'}
        aria-label="Switch to grid view"
      >
        {isChanging && viewMode !== 'grid' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Grid3X3 className="h-4 w-4" />
        )}
        <span className="sr-only">Grid view</span>
      </Button>
      
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleTableClick}
        disabled={disabled || isChanging}
        className={`h-8 px-3 relative z-10 transition-all duration-200 ${
          viewMode === 'table' 
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
        title="Table view"
        type="button"
        aria-pressed={viewMode === 'table'}
        aria-label="Switch to table view"
      >
        {isChanging && viewMode !== 'table' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <List className="h-4 w-4" />
        )}
        <span className="sr-only">Table view</span>
      </Button>
    </div>
  )
}