"use client";

import { useCallback, memo, useState } from "react";
import { Grid } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
// @ts-ignore
import { FileCard } from "./FileCard";
import { FolderCard } from "./FolderCard";
import { FileTableView } from "./FileTableView";
import { motion } from "framer-motion";
import { ActionDataBar } from "./ActionDataBar";

interface FileData {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  downloadURL: string;
  storagePath: string;
  userId: string;
  folderId: string | null;
  createdAt: any;
  updatedAt?: any;
}

interface FolderData {
  id: string;
  name: string;
  userId: string;
  parentId: string | null;
  createdAt: any;
  updatedAt?: any;
}

interface FileListProps {
  files: FileData[];
  folders: FolderData[];
  viewMode: "grid" | "table";
  onFolderOpen: (folder: FolderData | null) => void;
  currentFolder: FolderData | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onRefresh?: () => void;
}

// Grid Configuration
const GAP = 16;
const CELL_HEIGHT = 300; // Height of cards + gap
const MIN_COL_WIDTH = 220;

// Cell component defined outside to prevent re-creation
const Cell = memo(({ columnIndex, rowIndex, style, items, columnCount, onFolderOpen, currentFolder, selectedIds, toggleSelection, onRefresh }: any) => {
  const index = rowIndex * columnCount + columnIndex;

  if (index >= items.length) return null;

  const item = items[index];
  const isFolder = item.type === 'folder';
  const isSelected = selectedIds?.has(item.id)
  const FileCardAny = FileCard as any;

  const handleSelect = (e: any) => {
    // Logic for shift/ctrl keys
    const multiSelect = e?.ctrlKey || e?.metaKey
    const rangeSelect = e?.shiftKey
    toggleSelection(item.id, multiSelect, rangeSelect)
  }

  // Use padding to create the gap effect instead of manipulating top/left which might be null due to transform
  const combinedStyle = {
    ...style,
    boxSizing: 'border-box',
    paddingLeft: GAP,
    paddingTop: GAP,
    width: style.width,
    height: style.height
  } as React.CSSProperties;

  return (
    <div style={combinedStyle}>
      <div className="w-full h-full">
        {isFolder ? (
          /* @ts-ignore */
          <FolderCard folder={item as FolderData} onOpen={onFolderOpen} />
        ) : (
          /* @ts-ignore */
          <FileCardAny
            file={item as FileData}
            currentFolder={currentFolder}
            isSelected={isSelected}
            onSelect={toggleSelection ? () => toggleSelection(item.id, true, false) : undefined}
            selectionMode={selectedIds && selectedIds.size > 0}
            onDeleteSuccess={onRefresh}
          />
        )}
      </div>
    </div>
  );
});
Cell.displayName = 'Cell';

export const FileList = memo(function FileList({
  files,
  folders,
  viewMode,
  onFolderOpen,
  currentFolder,
  onLoadMore,
  hasMore,
  isLoadingMore,
  onRefresh
}: FileListProps) {



  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const toggleSelection = useCallback((id: string, multiSelect: boolean, rangeSelect: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(multiSelect ? prev : [])

      if (rangeSelect && lastSelectedId) {
        // Find range (simplified for now - requires flat list index finding, leaving basic range for next iteration if needed)
        // For now, Shift+Click just adds without clearing
        next.add(id)
      } else {
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
    setLastSelectedId(id)
  }, [lastSelectedId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  // Combine items: Folders first, then Files
  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' })),
    ...files.map(f => ({ ...f, type: 'file' }))
  ];

  // Pass selection props to cell
  const cellData = {
    items: allItems,
    columnCount: 0, // Injected by grid
    onFolderOpen,
    currentFolder,
    selectedIds,
    toggleSelection,
    onRefresh
  }

  // Helpers for ActionDataBar
  const getSelectedItems = useCallback(() => {
    const selected = []
    for (const item of folders) {
      if (selectedIds.has(item.id)) selected.push({ ...item, type: 'folder' })
    }
    for (const item of files) {
      if (selectedIds.has(item.id)) selected.push({ ...item, type: 'file' })
    }
    return selected
  }, [selectedIds, folders, files])

  // Need a refresh trigger for parent content - for now we can rely on SWR automatic revalidation or parent refresh
  // But passed callback onRefresh would be better. For now assuming parent handles it or specific events.
  const handleRefresh = useCallback(() => {
    // Ideally trigger parent refresh. 
    // We can dispatch an event or use a callback prop if added.
    // For now, let's dispatch a custom event that useFolderData might listen to? 
    // Or simpler: Just window reload or query invalidation.
    // Let's use MUTATE via global SWR or...
    // Since this is inside FileList, we don't have direct mutate access easily without props.
    // Let's assume the mutation happens in ActionDataBar or we pass a dummy refresh.
    // Actually ActionDataBar handles the firestore calls, so local list needs to update.
    // We'll rely on the parent (page.tsx) to handle data refreshment, OR
    // we can accept an onRefresh prop in FileList if not already there.
    // It seems we don't have onRefresh prop.
    window.location.reload() // Brute force fallback for now until perfected
  }, [])

  // Conditionally import ActionDataBar to avoid circular dep issues if any, or just use it.

  if (viewMode === "table") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full"
      >
        <FileTableView
          files={files}
          folders={folders}
          onFolderOpen={onFolderOpen}
          currentFolder={currentFolder}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
      </motion.div>
    );
  }

  return (
    <>
      <div className="h-full w-full" onClick={(e) => {
        // Clear selection when clicking empty background
        if (e.target === e.currentTarget) clearSelection()
      }}>
        <AutoSizer
          renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => {
            // If dimensions are not yet available or invalid, return null
            if (!height || !width || isNaN(height) || isNaN(width)) return null;

            // Calculate columns
            // Mobile optimization: Use smaller min width for mobile (< 640px) to allow 2 columns
            const isMobile = width < 640;
            const effectiveMinColWidth = isMobile ? 160 : MIN_COL_WIDTH;

            const columnCount = Math.max(1, Math.floor((width + GAP) / (effectiveMinColWidth + GAP)));
            const columnWidth = (width - GAP) / columnCount;
            const rowCount = Math.ceil(allItems.length / columnCount);

            const onCellsRendered = ({ rowStopIndex }: any) => {
              if (hasMore && !isLoadingMore && onLoadMore) {
                if (rowStopIndex >= rowCount - 2) {
                  onLoadMore();
                }
              }
            };

            return (
              <div style={{ height, width }}>
                {/* @ts-ignore */}
                <Grid
                  columnCount={columnCount}
                  columnWidth={columnWidth}
                  style={{ height, width }}
                  rowCount={rowCount}
                  rowHeight={CELL_HEIGHT}
                  cellComponent={Cell as any}
                  cellProps={{ ...cellData, columnCount }}
                  className="no-scrollbar"
                  onCellsRendered={onCellsRendered}
                />
              </div>
            );
          }}
        />
      </div>

      {/* Render Action Bar */}
      <ActionDataBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        selectedItems={getSelectedItems()}
        onRefresh={handleRefresh}
      />
    </>
  );
});