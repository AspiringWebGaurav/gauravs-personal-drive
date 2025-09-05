'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FileDocument } from '@/types/files';

interface FileSelectionContextType {
  selectedFiles: Set<string>;
  isSelecting: boolean;
  selectFile: (fileId: string) => void;
  unselectFile: (fileId: string) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: (files: FileDocument[]) => void;
  clearSelection: () => void;
  setSelecting: (selecting: boolean) => void;
  getSelectedFiles: (files: FileDocument[]) => FileDocument[];
  selectedCount: number;
}

const FileSelectionContext = createContext<FileSelectionContextType | undefined>(undefined);

export const useFileSelection = () => {
  const context = useContext(FileSelectionContext);
  if (!context) {
    throw new Error('useFileSelection must be used within FileSelectionProvider');
  }
  return context;
};

interface FileSelectionProviderProps {
  children: ReactNode;
}

export const FileSelectionProvider = ({ children }: FileSelectionProviderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const selectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => new Set(prev).add(fileId));
  }, []);

  const unselectFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  }, []);

  const selectAllFiles = useCallback((files: FileDocument[]) => {
    const allFileIds = new Set(files.map(file => file.id));
    setSelectedFiles(allFileIds);
    setIsSelecting(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setIsSelecting(false);
  }, []);

  const setSelecting = useCallback((selecting: boolean) => {
    setIsSelecting(selecting);
    if (!selecting) {
      setSelectedFiles(new Set());
    }
  }, []);

  const getSelectedFiles = useCallback((files: FileDocument[]) => {
    return files.filter(file => selectedFiles.has(file.id));
  }, [selectedFiles]);

  const value: FileSelectionContextType = {
    selectedFiles,
    isSelecting,
    selectFile,
    unselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
    setSelecting,
    getSelectedFiles,
    selectedCount: selectedFiles.size,
  };

  return (
    <FileSelectionContext.Provider value={value}>
      {children}
    </FileSelectionContext.Provider>
  );
};