"use client";

import { useEffect, useCallback } from "react";
import { FileCard } from "./FileCard";
import { FolderCard } from "./FolderCard";
import { FileTableView } from "./FileTableView";

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
}

export function FileList({
  files,
  folders,
  viewMode,
  onFolderOpen,
  currentFolder,
}: FileListProps) {
  // Debug (optional: remove in prod)
  useEffect(() => {
    console.log(
      "FileList: View mode:",
      viewMode,
      "files:",
      files.length,
      "folders:",
      folders.length
    );
  }, [viewMode, files.length, folders.length]);

  // Stable open handler (avoids new closures per render)
  const openFolder = useCallback(
    (folder: FolderData) => {
      onFolderOpen(folder); // DashboardPage's handleFolderNavigate(folder)
    },
    [onFolderOpen]
  );

  // Keyboard support for folder tiles
  const onFolderKeyDown = useCallback(
    (e: React.KeyboardEvent, folder: FolderData) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFolder(folder);
      }
    },
    [openFolder]
  );

  if (viewMode === "table") {
    return (
      <div
        key={`table-${files.length}-${folders.length}`}
        className="animate-slide-left"
      >
        <FileTableView
          files={files}
          folders={folders}
          onFolderOpen={openFolder}
          currentFolder={currentFolder}
        />
      </div>
    );
  }

  // Grid view
  return (
    <div
      key={`grid-${files.length}-${folders.length}-${
        currentFolder?.id || "root"
      }`}
      className="
        grid
        grid-cols-2
        sm:grid-cols-3
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        2xl:grid-cols-6
        gap-4 animate-slide-left
      "
      role="list"
      aria-label="Files and folders"
    >
      {folders.map((folder, index) => (
        <div
          key={folder.id}
          data-folder-id={folder.id}
          data-kind="folder"
          className="folder-card animate-fade-in"
          style={{
            animationDelay: `${index * 50}ms`,
            animationFillMode: "both",
          }}
          role="listitem"
        >
          {/* Ensure FolderCard is focusable/clickable for a11y & mobile */}
          <div
            role="button"
            tabIndex={0}
            aria-label={`Open folder ${folder.name}`}
            onClick={() => openFolder(folder)}
            onDoubleClick={() => openFolder(folder)}
            onKeyDown={(e) => onFolderKeyDown(e, folder)}
            className="outline-none focus:ring-2 focus:ring-ring rounded-lg"
            data-item="folder"
          >
            <FolderCard folder={folder} onOpen={() => openFolder(folder)} />
          </div>
        </div>
      ))}

      {files.map((file, index) => (
        <div
          key={file.id}
          data-file-id={file.id}
          data-kind="file"
          className="file-card animate-fade-in"
          style={{
            animationDelay: `${(folders.length + index) * 50}ms`,
            animationFillMode: "both",
          }}
          role="listitem"
        >
          <FileCard file={file} currentFolder={currentFolder} />
        </div>
      ))}
    </div>
  );
}