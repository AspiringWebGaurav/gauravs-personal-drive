"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth, useAuth } from "@/components/providers/AuthProvider";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import {
  collection,
  query,
  where,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { firestore } from "@/lib/firebaseClient";
import {
  onSnapshotWithRetry,
  handleFirestoreError,
} from "@/lib/firestoreHelpers";
import { UploadArea } from "@/components/dashboard/UploadArea";
import { FileList } from "@/components/dashboard/FileList";
import { UsageBar } from "@/components/dashboard/UsageBar";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CreateFolderDialog } from "@/components/dashboard/CreateFolderDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileStorageIndicator } from "@/components/dashboard/MobileStorageIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useNotification } from "@/components/providers/NotificationProvider";
import { logger } from "@/lib/logger";
import { getUserDisplayName, getUserInitials } from "@/lib/auth";

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
type ViewMode = "grid" | "table";
type PageSlice = {
  items: Array<FileData | FolderData>;
  total: number;
  page: number;
  pageCount: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isTokenReady } = useRequireAuth();
  const { signOut } = useAuth();
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
  const uploadAreaTriggerRef = useRef<(() => void) | null>(null);

  // Pagination (fits to viewport; no long scroll)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18); // adapt to width

  // REF: scrollable canvas for mobile long-press + tap logic
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);

  // Adapt pageSize to viewport width
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480) setPageSize(10);
      else if (w < 768) setPageSize(12);
      else if (w < 1024) setPageSize(16);
      else if (w < 1440) setPageSize(18);
      else setPageSize(24);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleViewModeChange = (newMode: ViewMode) => {
    logger.ui("Changing view mode", viewMode, "=>", newMode);
    setViewMode(newMode);
  };

  // Build folder hierarchy path (still used by EmptyState)
  const buildFolderHierarchy = useCallback(
    (targetFolder: FolderData | null): FolderData[] => {
      if (!targetFolder) return [];
      const path: FolderData[] = [];
      let curr = targetFolder;
      while (curr && path.length < 20) {
        path.unshift(curr);
        if (curr.parentId) {
          const p = allFolders.get(curr.parentId);
          if (p) curr = p;
          else break;
        } else break;
      }
      return path;
    },
    [allFolders]
  );

  // Fetch all folders
  useEffect(() => {
    if (!user || !isTokenReady) return;
    const allFoldersQuery = query(
      collection(firestore, "folders"),
      where("userId", "==", user.uid)
    );
    const cleanup = onSnapshotWithRetry(
      allFoldersQuery,
      (snapshot) => {
        const map = new Map<string, FolderData>();
        snapshot.docs.forEach((doc: any) => {
          map.set(doc.id, { id: doc.id, ...doc.data() } as FolderData);
        });
        setAllFolders(map);
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
    setFolderHierarchy(buildFolderHierarchy(currentFolder));
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
        setFiles(
          snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as FileData))
        );
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
        setFolders(
          snapshot.docs.map(
            (d: any) => ({ id: d.id, ...d.data() } as FolderData)
          )
        );
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

  // Navigation helpers
  const handleFolderNavigate = useCallback((folder: FolderData | null) => {
    setCurrentFolder(folder);
    setPage(1);
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
  const handleCreateFolderSuccess = useCallback(() => {
    toast.success("Folder created!");
    showSuccess("Folder created", "Your new folder is ready.", {
      autoCloseDuration: 2500,
    });
  }, [showSuccess]);

  // Auth actions
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (e) {
      console.error("Failed to sign out", e);
      toast.error("Sign out failed. Try again.");
    }
  };

  // combine + paginate (folders first)
  const combinedItems = useMemo(() => [...folders, ...files], [folders, files]);

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

  // Keyboard pagination
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

  // --- Mobile interactions (unchanged) ---
  useEffect(() => {
    const el = canvasScrollRef.current;
    if (!el) return;
    const looksMobile =
      (typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
      (typeof window !== "undefined" && "ontouchstart" in window);
    if (!(looksMobile && window.innerWidth <= 1024)) return;

    const isFolderCard = (start: HTMLElement | null): HTMLElement | null => {
      if (!start) return null;
      return start.closest(
        [
          "[data-folder-id]",
          ".folder-card",
          "[role='row'][data-kind='folder']",
          "[data-item='folder']",
          "[data-kind='folder']",
        ].join(",")
      ) as HTMLElement | null;
    };

    const findCard = (start: HTMLElement): HTMLElement =>
      (start.closest(
        [
          ".file-card",
          ".folder-card",
          ".group",
          "[role='row']",
          "[role='gridcell']",
          "[data-file-id]",
          "[data-folder-id]",
          "[data-item]",
          "[data-kind]",
          "[data-radix-popper-anchor]",
          "[data-radix-collection-item]",
          "[role='button']",
        ].join(",")
      ) || start) as HTMLElement;

    const findTrigger = (scope: HTMLElement): HTMLElement | null => {
      const selectors = [
        "button[aria-label='More actions']",
        "button[aria-label='Options']",
        ".file-more-trigger",
        ".folder-more-trigger",
        "[data-more-trigger]",
        "[data-testid='more-actions']",
        "[data-trigger='more']",
        "[aria-haspopup='menu']",
        ":scope button",
      ].join(",");
      return (
        scope.querySelector(selectors) ||
        scope.parentElement?.querySelector(selectors) ||
        null
      );
    };

    const fireMouseSequence = (node: HTMLElement) => {
      const init = { bubbles: true, cancelable: true } as MouseEventInit;
      node.dispatchEvent(new MouseEvent("mousedown", init));
      node.dispatchEvent(new MouseEvent("mouseup", init));
      node.dispatchEvent(new MouseEvent("click", init));
    };

    const firePointerSequence = (node: HTMLElement) => {
      try {
        const init: PointerEventInit = {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
        };
        node.dispatchEvent(new PointerEvent("pointerdown", init));
        node.dispatchEvent(new PointerEvent("pointerup", init));
        node.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
      } catch {}
    };

    const fireContextMenuAt = (node: HTMLElement, x: number, y: number) => {
      node.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 2,
        })
      );
    };

    const openActionsAt = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!target) return;
      const card = findCard(target);
      const trigger = findTrigger(card) || findTrigger(target);

      if (trigger) {
        (trigger as HTMLElement).focus?.();
        fireMouseSequence(trigger as HTMLElement);
        firePointerSequence(trigger as HTMLElement);
        fireContextMenuAt(trigger as HTMLElement, x, y);
      } else {
        fireContextMenuAt(target, x, y);
        if (card && card !== target) fireContextMenuAt(card, x, y);
      }
    };

    let holdTimer: number | null = null;
    let startX = 0;
    let startY = 0;
    let holding = false;
    const MOVE_CANCEL_PX = 25;
    const LONG_PRESS_MS = 3000;
    const originalTouchAction = (el as HTMLElement).style.touchAction;

    let lastTapTime = 0;
    let lastTapCard: HTMLElement | null = null;
    let suppressNextClick = false;
    const DOUBLE_TAP_MS = 350;
    const QUICK_TAP_MS = 250;
    let touchStartAt = 0;

    const clearHold = () => {
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (holding) {
        (el as HTMLElement).style.touchAction = originalTouchAction;
        holding = false;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      touchStartAt = Date.now();

      holding = true;
      (el as HTMLElement).style.touchAction = "none";
      holdTimer = window.setTimeout(() => {
        try {
          e.preventDefault();
        } catch {}
        openActionsAt(startX, startY);
        if (navigator.vibrate) navigator.vibrate(10);
        clearHold();
      }, LONG_PRESS_MS) as unknown as number;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!holdTimer) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        clearHold();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const duration = Date.now() - touchStartAt;
      const endTarget = e.target as HTMLElement | null;

      if (!holdTimer && !holding) return;

      if (duration < QUICK_TAP_MS) {
        const folder = isFolderCard(endTarget);
        if (folder) {
          const now = Date.now();
          const withinWindow = now - lastTapTime <= DOUBLE_TAP_MS;
          const sameCard =
            lastTapCard &&
            (folder === lastTapCard || folder.isSameNode(lastTapCard));

          if (withinWindow && sameCard) {
            const openTarget =
              (folder.querySelector(
                "a,button,[role='button']"
              ) as HTMLElement) || folder;
            if (navigator.vibrate) navigator.vibrate(5);
            suppressNextClick = false;
            openTarget.click();
            lastTapTime = 0;
            lastTapCard = null;
          } else {
            suppressNextClick = true;
            lastTapTime = now;
            lastTapCard = folder;
            toast.dismiss("dbltap-hint");
            toast.message("Tap again to open folder", {
              id: "dbltap-hint",
              duration: 800,
            });
          }
        }
      }

      clearHold();
    };

    const onTouchCancel = () => clearHold();

    const onClickCapture = (e: MouseEvent) => {
      if (!suppressNextClick) return;
      const target = e.target as HTMLElement | null;
      const folder = isFolderCard(target);
      if (folder) {
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
        suppressNextClick = false;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    el.addEventListener("click", onClickCapture, { capture: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart as any);
      el.removeEventListener("touchmove", onTouchMove as any);
      el.removeEventListener("touchend", onTouchEnd as any);
      el.removeEventListener("touchcancel", onTouchCancel as any);
      el.removeEventListener("click", onClickCapture as any, true);
      (el as HTMLElement).style.touchAction = "";
    };
  }, []);

  // --- UI ---
  if (authLoading || !isTokenReady) {
    return (
      <div className="fixed inset-0 w-screen overflow-hidden bg-background flex items-center justify-center">
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

  return (
    <div
      ref={swipeRef as any}
      className="fixed inset-0 w-screen overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      {/* Compact header (56px) */}
      <header className="h-14 px-3 sm:px-4 border-b bg-white/90 dark:bg-gray-900/80 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white grid place-items-center font-bold">
            G
          </div>
          <div className="truncate">
            <p className="text-[11px] leading-none text-gray-500">Home</p>
            <h1 className="text-sm sm:text-base font-semibold truncate">
              Gaurav&apos;s Personal Drive
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MobileStorageIndicator />

          <CreateFolderDialog
            currentFolder={currentFolder}
            onSuccess={() => {
              toast.success("Folder created!");
              showSuccess("Folder created", "Your new folder is ready.", {
                autoCloseDuration: 2500,
              });
            }}
          >
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <FolderPlus className="h-4 w-4 mr-2" /> New Folder
            </Button>
          </CreateFolderDialog>

          <Button variant="secondary" size="sm" onClick={handleUploadTrigger} className={undefined}>
            Upload
          </Button>

          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />

          {/* Theme toggle keeps parity with Navbar feature */}
          <ThemeToggle />

          {/* RIGHT-END ACCOUNT MENU */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full p-0"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user?.photoURL ?? undefined}
                      alt={getUserDisplayName(user)} className={undefined}                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal" inset={undefined}>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground break-all">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className={undefined} />
                <DropdownMenuItem asChild className="cursor-pointer" inset={undefined}>
                  <Link href="/account" aria-label="Go to profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer" inset={undefined}>
                  <Link href="/settings" aria-label="Go to settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className={undefined} />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  onSelect={(e: { preventDefault: () => void; }) => {
                    e.preventDefault();
                    handleSignOut();
                  } } inset={undefined}                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className={undefined}>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main fits the rest exactly; prefer 100dvh where supported to prevent iOS jump */}
      <main className="h-[calc(100svh-56px)] supports-[height:100dvh]:h-[calc(100dvh-56px)] px-3 sm:px-4 py-3 overflow-hidden">
        <div className="grid h-full grid-cols-12 gap-3 min-h-0">
          {/* LEFT RAIL — only Drag & Drop and Free Quota */}
          <aside className="hidden lg:grid lg:col-span-3 grid-rows-[1fr_auto] gap-3 min-h-0 overflow-hidden">
            <section className="rounded-2xl border bg-card p-3 overflow-hidden min-h-0">
              <div className="h-full min-h-0 overflow-hidden">
                <UploadArea
                  currentFolder={currentFolder}
                  onUploadComplete={handleUploadComplete}
                  onRegisterTrigger={handleRegisterTrigger}
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-3 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden">
                <UsageBar />
              </div>
            </section>
          </aside>

          {/* FILE CANVAS */}
          <section className="col-span-12 lg:col-span-9 rounded-2xl border bg-card flex flex-col min-h-0 overflow-hidden">
            {/* Canvas header (48px) */}
            <div className="h-12 min-h-12 flex items-center justify-between gap-2 px-3 sm:px-4 border-b">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {slice.total} items · Page {slice.page} of {slice.pageCount}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous page"
                  onClick={handlePrev}
                  disabled={!canPrev} className={undefined}                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next page"
                  onClick={handleNext}
                  disabled={!canNext} className={undefined}                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Canvas body — scroll within on mobile only */}
            <div
              ref={canvasScrollRef}
              className="flex-1 px-3 sm:px-4 min-h-0 md:overflow-hidden overflow-auto overscroll-contain touch-manipulation select-none"
              style={{ paddingTop: 12, paddingBottom: 12 }}
            >
              <div className="w-full h-full">
                {loading ? (
                  <div className="h-full w-full grid place-items-center">
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
                  <div className="h-full w-full">
                    <EmptyState
                      currentFolder={currentFolder}
                      onUploadTrigger={handleUploadTrigger}
                      folderHierarchy={folderHierarchy}
                      onNavigateHome={() => handleFolderNavigate(null)}
                      onNavigateToParent={navigateToParent}
                      onNavigateToFolder={handleFolderNavigate}
                      enableSwipeNavigation
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Canvas footer (48px) */}
            <div className="h-12 min-h-12 flex items-center justify-between gap-2 px-3 sm:px-4 border-t">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {hasItems ? (
                  <>
                    Showing {(slice.page - 1) * pageSize + 1}–
                    {Math.min(slice.page * pageSize, slice.total)} of{" "}
                    {slice.total}
                  </>
                ) : (
                  <>No items</>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={!canPrev} className={undefined}                >
                  Prev
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNext}
                  disabled={!canNext} className={undefined}                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile action dock (like Drive) */}
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

      <style jsx global>{`
        /* Mobile-only helpers */
        @media (max-width: 1024px) {
          button[aria-label="More actions"],
          button[aria-label="Options"],
          .file-more-trigger,
          .folder-more-trigger {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
          }
          .group .opacity-0 {
            opacity: 1 !important;
          }
          * {
            -webkit-touch-callout: none;
          }
        }
      `}</style>
    </div>
  );
}