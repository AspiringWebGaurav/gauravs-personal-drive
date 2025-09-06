"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRequireAuth } from "@/components/providers/AuthProvider";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import {
  collection,
  query,
  where,
  orderBy,
  DocumentData,
  limit,
  startAfter,
} from "firebase/firestore";
import { firestore } from "@/lib/firebaseClient";
import {
  onSnapshotWithRetry,
  handleFirestoreError,
} from "@/lib/firestoreHelpers";
import { Navbar } from "@/components/dashboard/Navbar";
import { UploadArea } from "@/components/dashboard/UploadArea";
import { FileList } from "@/components/dashboard/FileList";
import { UsageBar } from "@/components/dashboard/UsageBar";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { FolderBreadcrumb } from "@/components/dashboard/FolderBreadcrumb";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CreateFolderDialog } from "@/components/dashboard/CreateFolderDialog";
import { Button } from "@/components/ui/button";
import { FolderPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNotification } from "@/components/providers/NotificationProvider";
import { logger } from "@/lib/logger";

interface FileData extends DocumentData {
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

interface FolderData extends DocumentData {
  id: string;
  name: string;
  userId: string;
  parentId: string | null;
  createdAt: any;
  updatedAt?: any;
}

interface UsageData {
  usedBytes: number;
  limitBytes: number;
}

type ViewMode = "grid" | "table";

type PageSlice = {
  items: Array<FileData | FolderData>;
  total: number;
  page: number;
  pageCount: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading, isTokenReady } = useRequireAuth();
  const { showSuccess } = useNotification();

  // Data
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null);
  const [folderHierarchy, setFolderHierarchy] = useState<FolderData[]>([]);
  const [allFolders, setAllFolders] = useState<Map<string, FolderData>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // UX / Layout
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [usage, setUsage] = useState<UsageData>({
    usedBytes: 0,
    limitBytes: 5 * 1024 * 1024 * 1024,
  });
  const uploadAreaTriggerRef = useRef<(() => void) | null>(null);

  // Pagination (click-more, no long-scroll)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18); // will adapt to breakpoint

  // Adapt pageSize to viewport
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      // tuned for Google Drive–like density
      if (w < 480) setPageSize(8);
      else if (w < 768) setPageSize(12);
      else if (w < 1024) setPageSize(16);
      else if (w < 1440) setPageSize(18);
      else setPageSize(24);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // View mode change
  const handleViewModeChange = (newMode: ViewMode) => {
    logger.ui("Changing view mode", viewMode, "=>", newMode);
    setViewMode(newMode);
  };

  // Build folder hierarchy path
  const buildFolderHierarchy = useCallback(
    (targetFolder: FolderData | null): FolderData[] => {
      if (!targetFolder) return [];
      const path: FolderData[] = [];
      let currentFolderInPath = targetFolder;
      while (currentFolderInPath && path.length < 20) {
        path.unshift(currentFolderInPath);
        if (currentFolderInPath.parentId) {
          const parentFolder = allFolders.get(currentFolderInPath.parentId);
          if (parentFolder) currentFolderInPath = parentFolder;
          else break;
        } else break;
      }
      return path;
    },
    [allFolders]
  );

  // Fetch all folders (for breadcrumbs + parent nav)
  useEffect(() => {
    if (!user || !isTokenReady) return;
    const allFoldersQuery = query(
      collection(firestore, "folders"),
      where("userId", "==", user.uid)
    );
    const cleanup = onSnapshotWithRetry(
      allFoldersQuery,
      (snapshot) => {
        const foldersMap = new Map<string, FolderData>();
        snapshot.docs.forEach((doc: any) => {
          const folderData = { id: doc.id, ...doc.data() } as FolderData;
          foldersMap.set(doc.id, folderData);
        });
        setAllFolders(foldersMap);
      },
      {
        maxRetries: 3,
        retryDelay: 1500,
        onError: (e) => logger.error("All folders error", e),
      }
    );
    return cleanup;
  }, [user, isTokenReady]);

  useEffect(() => {
    const newHierarchy = buildFolderHierarchy(currentFolder);
    setFolderHierarchy(newHierarchy);
  }, [currentFolder, allFolders, buildFolderHierarchy]);

  // Real-time listeners for the active folder
  useEffect(() => {
    if (!user || !isTokenReady) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setPermissionError(null);

    const filesQuery = query(
      collection(firestore, "files"),
      where("userId", "==", user.uid),
      where("folderId", "==", currentFolder?.id || null),
      orderBy("createdAt", "desc")
    );

    const foldersQuery = query(
      collection(firestore, "folders"),
      where("userId", "==", user.uid),
      where("parentId", "==", currentFolder?.id || null),
      orderBy("createdAt", "desc")
    );

    const cleanupFiles = onSnapshotWithRetry(
      filesQuery,
      (snapshot) => {
        const filesData = snapshot.docs.map((d: any) => ({
          id: d.id,
          ...d.data(),
        })) as FileData[];
        setFiles(filesData);
        setPermissionError(null);
      },
      {
        maxRetries: 5,
        retryDelay: 1500,
        onError: (error) =>
          setPermissionError(handleFirestoreError(error, "files query")),
        onRetry: (rc) => setPermissionError(`Reconnecting... (attempt ${rc})`),
      }
    );

    const cleanupFolders = onSnapshotWithRetry(
      foldersQuery,
      (snapshot) => {
        const foldersData = snapshot.docs.map((d: any) => ({
          id: d.id,
          ...d.data(),
        })) as FolderData[];
        setFolders(foldersData);
        setLoading(false);
        setPermissionError(null);
      },
      {
        maxRetries: 5,
        retryDelay: 1500,
        onError: (error) => {
          setPermissionError(handleFirestoreError(error, "folders query"));
          setLoading(false);
        },
        onRetry: (rc) => setPermissionError(`Reconnecting... (attempt ${rc})`),
      }
    );

    return () => {
      cleanupFiles();
      cleanupFolders();
    };
  }, [user, currentFolder, isTokenReady, retryCount]);

  // Usage
  useEffect(() => {
    if (!user || !isTokenReady) return;
    const usageQuery = query(
      collection(firestore, "usage"),
      where("userId", "==", user.uid)
    );
    const cleanup = onSnapshotWithRetry(
      usageQuery,
      (snapshot) => {
        if (!snapshot.empty) setUsage(snapshot.docs[0].data() as UsageData);
      },
      { maxRetries: 3, retryDelay: 2000 }
    );
    return cleanup;
  }, [user, isTokenReady]);

  // Navigation helpers
  const handleFolderNavigate = useCallback((folder: FolderData | null) => {
    setCurrentFolder(folder);
    setPage(1); // reset pagination when folder changes
  }, []);

  const navigateToParent = useCallback(() => {
    if (currentFolder?.parentId) {
      const parentFolder = allFolders.get(currentFolder.parentId);
      setCurrentFolder(parentFolder || null);
    } else setCurrentFolder(null);
    setPage(1);
  }, [currentFolder, allFolders]);

  // Swipe-to-go-back (mobile)
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeRight: () => currentFolder && navigateToParent(),
    threshold: 100,
    enabled: true,
  });

  // Upload handlers
  const handleUploadComplete = () => {
    toast.success("Files uploaded successfully!");
    showSuccess(
      "All Uploads Complete",
      "All your files have been uploaded successfully",
      { autoCloseDuration: 3000 }
    );
  };
  const handleUploadTrigger = useCallback(
    () => uploadAreaTriggerRef.current?.(),
    []
  );
  const handleRegisterTrigger = useCallback((triggerFn: () => void) => {
    uploadAreaTriggerRef.current = triggerFn;
  }, []);

  // Folder create success handler (for required onSuccess prop)
  const handleCreateFolderSuccess = useCallback(() => {
    toast.success("Folder created!");
    showSuccess("Folder created", "Your new folder is ready.", {
      autoCloseDuration: 2500,
    });
  }, [showSuccess]);

  // --- CLICK MORE / PAGINATION LOGIC ---
  const combinedItems = useMemo(() => {
    // Drive-like ordering: folders first then files, both already time-desc
    return [...folders, ...files];
  }, [folders, files]);

  const slice: PageSlice = useMemo(() => {
    const total = combinedItems.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), pageCount);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: combinedItems.slice(start, end),
      total,
      page: safePage,
      pageCount,
    };
  }, [combinedItems, page, pageSize]);

  const canPrev = slice.page > 1;
  const canNext = slice.page < slice.pageCount;

  const handlePrev = () => canPrev && setPage((p) => Math.max(1, p - 1));
  const handleNext = () =>
    canNext && setPage((p) => Math.min(slice.pageCount, p + 1));

  // Keyboard: Left/Right to paginate (table/grid focus area)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))
        return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPrev, canNext, slice.pageCount]);

  // --- UI ---
  if (authLoading || !isTokenReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-sm text-muted-foreground">
            {authLoading
              ? "Authenticating..."
              : "Preparing secure connection..."}
          </p>
        </div>
      </div>
    );
  }

  const hasItems = combinedItems.length > 0;

  const PermissionErrorRetry = () => (
    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Connection Issue
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
            Retrying automatically…
          </p>
        </div>
        <button
          onClick={() => setRetryCount((prev) => prev + 1)}
          className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={swipeRef as any}
      className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      {/* Top app bar */}
      <Navbar />

      {/* App layout: sticky header + two-rail content + docked footer (usage) */}
      <div className="mx-auto max-w-[1600px] px-2 sm:px-4 pt-4 pb-24 lg:pb-28">
        {/* Toolbar row */}
        <div className="sticky top-0 z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/50 border-b border-border">
          {permissionError && <PermissionErrorRetry />}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Left: breadcrumbs */}
            <FolderBreadcrumb
              currentFolder={currentFolder}
              folderHierarchy={folderHierarchy}
              onNavigate={handleFolderNavigate}
              onNavigateToParent={navigateToParent}
            />

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <CreateFolderDialog
                currentFolder={currentFolder}
                onSuccess={handleCreateFolderSuccess}
              >
                <Button variant="outline" size="sm" className="glass-button">
                  <FolderPlus className="h-4 w-4 mr-2" /> New Folder
                </Button>
              </CreateFolderDialog>
              <ViewToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            </div>
          </div>
        </div>

        {/* Main content rails */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 lg:gap-6 mt-4">
          {/* Left rail (mobile => collapses above) */}
          <div className="order-2 lg:order-1 space-y-4">
            <div className="rounded-2xl border bg-card p-3 md:p-4">
              <UploadArea
                currentFolder={currentFolder}
                onUploadComplete={handleUploadComplete}
                onRegisterTrigger={handleRegisterTrigger}
              />
            </div>

            <div className="rounded-2xl border bg-card p-3 md:p-4">
              <UsageBar usage={usage} />
            </div>
          </div>

          {/* Right rail: file canvas */}
          <section className="order-1 lg:order-2 rounded-2xl border bg-card p-0 overflow-hidden">
            {/* Canvas header: pagination controls */}
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {slice.total} items · Page {slice.page} of {slice.pageCount}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous page"
                  onClick={handlePrev}
                  disabled={!canPrev}
                  className=""
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next page"
                  onClick={handleNext}
                  disabled={!canNext}
                  className=""
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-2 sm:p-4 min-h-[420px]">
              {loading ? (
                <div className="flex justify-center py-16">
                  <LoadingSpinner />
                </div>
              ) : hasItems ? (
                <FileList
                  files={slice.items.filter(
                    (i): i is FileData => (i as any).downloadURL !== undefined
                  )}
                  folders={slice.items.filter(
                    (i): i is FolderData =>
                      (i as any).parentId !== undefined &&
                      (i as any).downloadURL === undefined
                  )}
                  viewMode={viewMode}
                  onFolderOpen={handleFolderNavigate}
                  currentFolder={currentFolder}
                />
              ) : (
                <EmptyState
                  currentFolder={currentFolder}
                  onUploadTrigger={handleUploadTrigger}
                  folderHierarchy={folderHierarchy}
                  onNavigateHome={() => handleFolderNavigate(null)}
                  onNavigateToParent={navigateToParent}
                  onNavigateToFolder={handleFolderNavigate}
                  enableSwipeNavigation
                />
              )}
            </div>

            {/* Canvas footer: duplicate pager for ease */}
            {hasItems && (
              <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-t">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing {(slice.page - 1) * pageSize + 1}–
                  {Math.min(slice.page * pageSize, slice.total)} of{" "}
                  {slice.total}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={!canPrev}
                    className=""
                  >
                    Prev
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNext}
                    disabled={!canNext}
                    className=""
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile action dock (keeps screen scroll minimal) */}
      <div className="lg:hidden fixed bottom-3 left-0 right-0 z-40 px-3">
        <div className="mx-auto max-w-md rounded-2xl border bg-background/95 backdrop-blur shadow-lg flex items-center justify-between px-3 py-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUploadTrigger}
            className="flex-1 mr-2"
          >
            Upload
          </Button>
          <CreateFolderDialog
            currentFolder={currentFolder}
            onSuccess={handleCreateFolderSuccess}
          >
            <Button variant="default" size="sm" className="flex-1">
              New Folder
            </Button>
          </CreateFolderDialog>
        </div>
      </div>
    </div>
  );
}
