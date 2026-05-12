"use client";

import { useCallback, memo, useState, useEffect } from "react";
import { Grid } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
// @ts-ignore
import { FileCard } from "./FileCard";
import { FolderCard } from "./FolderCard";
import { FileTableView } from "./FileTableView";
import { FilePreviewModal } from "./FilePreviewModal";
import { motion } from "framer-motion";
import { ActionDataBar } from "./ActionDataBar";
import { CheckCircle2, Square } from "lucide-react";

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
const CELL_HEIGHT = 300;
const MIN_COL_WIDTH = 220;

// Cell component defined outside to prevent re-creation
const Cell = memo(({ columnIndex, rowIndex, style, items, columnCount, onFolderOpen, currentFolder, selectedIds, toggleSelection, onRefresh, onOpenPreview }: any) => {
  const index = rowIndex * columnCount + columnIndex;

  if (index >= items.length) return null;

  const item = items[index];
  const isFolder = item.type === 'folder';
  const isSelected = selectedIds?.has(item.id);
  const selectionMode = selectedIds && selectedIds.size > 0;
  const FileCardAny = FileCard as any;

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
          <FolderCard
            folder={item as FolderData}
            onOpen={onFolderOpen}
            isSelected={isSelected}
            onSelect={(e: any) => {
              if (toggleSelection) {
                const multiSelect = e?.ctrlKey || e?.metaKey;
                const rangeSelect = e?.shiftKey;
                toggleSelection(item.id, multiSelect, rangeSelect);
              }
            }}
            selectionMode={selectionMode}
          />
        ) : (
          /* @ts-ignore */
          <FileCardAny
            file={item as FileData}
            currentFolder={currentFolder}
            isSelected={isSelected}
            onSelect={(e: any) => {
              if (toggleSelection) {
                const multiSelect = e?.ctrlKey || e?.metaKey;
                const rangeSelect = e?.shiftKey;
                toggleSelection(item.id, multiSelect, rangeSelect);
              }
            }}
            selectionMode={selectionMode}
            onDeleteSuccess={onRefresh}
            onOpenPreview={onOpenPreview}
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
  // ── Preview state (shared across all FileCards in grid view) ────────
  const [gridPreviewFile, setGridPreviewFile] = useState<FileData | null>(null);
  const openPreview = useCallback((file: FileData) => {
    setGridPreviewFile(file);
  }, []);

  // ── Multi-select state ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Combine items: Folders first, then Files
  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' })),
    ...files.map(f => ({ ...f, type: 'file' }))
  ];

  const fileItems = files.map(f => ({ ...f, type: 'file' }));

  // ── Toggle selection ───────────────────────────────────────────────
  const toggleSelection = useCallback((id: string, multiSelect: boolean, rangeSelect: boolean) => {
    setSelectedIds(prev => {
      // Shift+Click: select range
      if (rangeSelect && lastSelectedId) {
        const next = new Set(prev);
        const allFileIds = fileItems.map(f => f.id);
        const startIdx = allFileIds.indexOf(lastSelectedId);
        const endIdx = allFileIds.indexOf(id);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          for (let i = from; i <= to; i++) {
            next.add(allFileIds[i]);
          }
        } else {
          next.add(id);
        }
        return next;
      }

      // Ctrl/Cmd+Click: add/remove single
      if (multiSelect) {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      }

      // Plain click: toggle single (clear others)
      if (prev.has(id) && prev.size === 1) {
        return new Set(); // deselect if only this one was selected
      }
      return new Set([id]);
    });
    setLastSelectedId(id);
  }, [lastSelectedId, fileItems]);

  // ── Select all / clear ─────────────────────────────────────────────
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(fileItems.map(f => f.id)));
  }, [fileItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const isAllSelected = fileItems.length > 0 && selectedIds.size === fileItems.length;
  const isSomeSelected = selectedIds.size > 0;

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+A / Cmd+A → select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only if not inside an input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        selectAll();
      }
      // Escape → clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
      // Delete → if items selected, trigger delete
      if (e.key === 'Delete' && selectedIds.size > 0) {
        // Let the ActionDataBar handle the actual deletion
        // We dispatch a custom event that ActionDataBar can listen to
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectAll, clearSelection, selectedIds.size]);

  // ── Refresh helper ─────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.dispatchEvent(new CustomEvent('quota:update'));
    }
  }, [onRefresh]);

  // ── Selected items for ActionDataBar ───────────────────────────────
  const getSelectedItems = useCallback(() => {
    const selected: any[] = [];
    for (const item of folders) {
      if (selectedIds.has(item.id)) selected.push({ ...item, type: 'folder' });
    }
    for (const item of files) {
      if (selectedIds.has(item.id)) selected.push({ ...item, type: 'file' });
    }
    return selected;
  }, [selectedIds, folders, files]);

  // ── Cell data for grid ─────────────────────────────────────────────
  const cellData = {
    items: allItems,
    columnCount: 0,
    onFolderOpen,
    currentFolder,
    selectedIds,
    toggleSelection,
    onRefresh: handleRefresh,
    onOpenPreview: openPreview
  };

  // ── Table view ─────────────────────────────────────────────────────
  if (viewMode === "table") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full"
      >
        {/* @ts-ignore */}
        <FileTableView
          files={files}
          folders={folders}
          onFolderOpen={onFolderOpen}
          currentFolder={currentFolder}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          selectAll={selectAll}
          clearSelection={clearSelection}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
          onRefresh={handleRefresh}
        />
        <ActionDataBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          selectedItems={getSelectedItems()}
          onRefresh={handleRefresh}
        />
      </motion.div>
    );
  }

  // ── Grid view ──────────────────────────────────────────────────────
  return (
    <>
      {/* Select All Bar */}
      {fileItems.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 mb-1">
          <button
            onClick={() => isAllSelected ? clearSelection() : selectAll()}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title={isAllSelected ? 'Deselect all' : 'Select all'}
          >
            {isAllSelected ? (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            ) : isSomeSelected ? (
              <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-primary rounded" />
              </div>
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>
              {isAllSelected
                ? `All ${fileItems.length} selected`
                : isSomeSelected
                  ? `${selectedIds.size} selected`
                  : 'Select all'}
            </span>
          </button>
          {isSomeSelected && (
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="h-full w-full" onClick={(e) => {
        if (e.target === e.currentTarget) clearSelection();
      }}>
        <AutoSizer
          renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => {
            if (!height || !width || isNaN(height) || isNaN(width)) return null;

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

      <ActionDataBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        selectedItems={getSelectedItems()}
        onRefresh={handleRefresh}
      />

      {/* Shared preview modal for grid view — enables prev/next across all files */}
      <FilePreviewModal
        isOpen={!!gridPreviewFile}
        onClose={() => setGridPreviewFile(null)}
        file={gridPreviewFile}
        allFiles={files}
        onNavigate={(f: any) => setGridPreviewFile(f)}
        onDelete={gridPreviewFile ? async () => {
          try {
            const { firestoreService } = await import('@/services/firestoreService');
            await firestoreService.softDeleteFile(gridPreviewFile.id);
            setGridPreviewFile(null);
            window.dispatchEvent(new CustomEvent('quota:update'));
            handleRefresh();
          } catch (e) {
            console.error(e);
          }
        } : undefined}
      />
    </>
  );
});