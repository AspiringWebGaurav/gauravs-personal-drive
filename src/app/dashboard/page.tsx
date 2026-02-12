"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth, useAuth } from "@/components/providers/AuthProvider";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import {
  DocumentData,
  DocumentSnapshot,
} from "firebase/firestore";
import { firestoreService } from "@/services/firestoreService";
import { handleFirestoreError } from "@/lib/firestoreHelpers";
import { useFolderData } from "@/hooks/useFolderData";
import { UploadArea } from "@/components/dashboard/UploadArea";
import { FileList } from "@/components/dashboard/FileList";
import { FolderBreadcrumb } from "@/components/dashboard/FolderBreadcrumb";
import { RecycleBinDialog } from '@/components/dashboard/RecycleBinDialog'
import { UsageBar } from "@/components/dashboard/UsageBar";
import { ViewToggle } from "@/components/dashboard/ViewToggle";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
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
  Home,
  Trash2,
  Loader2
} from "lucide-react";
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isTokenReady } = useRequireAuth();
  const { signOut } = useAuth();
  const { showSuccess, showError } = useNotification();

  // State
  const [currentFolder, setCurrentFolder] = useState<FolderData | null>(null);
  const [folderHierarchy, setFolderHierarchy] = useState<FolderData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");


  // UX / Layout
  const uploadAreaTriggerRef = useRef<(() => void) | null>(null);

  // Data Fetching with Cache
  const {
    files,
    folders,
    loading: dataLoading,
    loadingMore: loadingFiles,
    hasMore: hasMoreFiles,
    loadMore: loadMoreFiles,
    isError: dataError,
    refresh
  } = useFolderData(user?.uid, currentFolder?.id || null);



  // REF: scrollable canvas logic handled by virtualization now
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);

  // —— NAVIGATION HISTORY ——
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [backStack, setBackStack] = useState<(FolderData | null)[]>([]);
  const [forwardStack, setForwardStack] = useState<(FolderData | null)[]>([]);
  const canGoBack = backStack.length > 0;
  const canGoForward = forwardStack.length > 0;
  const canGoHome = currentFolder !== null;

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
  };

  // Fetch Breadcrumbs
  useEffect(() => {
    if (!user || !isTokenReady) return;
    const loadBreadcrumbs = async () => {
      const path = await firestoreService.getFolderPath(currentFolder?.id || null);
      setFolderHierarchy(path);
    };
    loadBreadcrumbs();
  }, [currentFolder, user, isTokenReady]);

  // —— CENTRALIZED NAV HELPERS ——
  const handleFolderNavigate = useCallback(
    (folder: FolderData | null, opts?: { fromHistory?: boolean }) => {
      setCurrentFolder((prev) => {
        if (!opts?.fromHistory) {
          setBackStack((s) => [...s, prev ?? null]);
          setForwardStack([]); // new branch -> clear forward
        }
        return folder;
      });
    },
    []
  );

  const navigateToParent = useCallback(() => {
    if (folderHierarchy.length > 1) {
      // Parent is the second item in the hierarchy
      handleFolderNavigate(folderHierarchy[folderHierarchy.length - 2]);
    } else {
      // Logic for top level
      handleFolderNavigate(null);
    }
  }, [folderHierarchy, handleFolderNavigate]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    setBackStack((prev) => {
      const dest = prev[prev.length - 1] ?? null;
      setForwardStack((f) => [...f, currentFolder ?? null]);
      setCurrentFolder(dest);
      return prev.slice(0, -1);
    });
  }, [canGoBack, currentFolder]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    setForwardStack((prev) => {
      const dest = prev[prev.length - 1] ?? null;
      setBackStack((b) => [...b, currentFolder ?? null]);
      setCurrentFolder(dest);
      return prev.slice(0, -1);
    });
  }, [canGoForward, currentFolder]);

  const goHome = useCallback(() => {
    if (!canGoHome) return;
    setBackStack((s) => [...s, currentFolder]);
    setForwardStack([]);
    setCurrentFolder(null);
  }, [canGoHome, currentFolder]);

  // Swipe-to-go-back (mobile): go to parent
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeRight: () => currentFolder && navigateToParent(),
    threshold: 100,
    enabled: true,
  });

  // Upload handlers
  const handleUploadComplete = () => {
    refresh();
  };
  const handleUploadTrigger = useCallback(
    () => uploadAreaTriggerRef.current?.(),
    []
  );
  const handleRegisterTrigger = useCallback((triggerFn: () => void) => {
    uploadAreaTriggerRef.current = triggerFn;
  }, []);
  const handleCreateFolderSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  // Auth actions
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch (e) {
      console.error("Failed to sign out", e);
      showError("Sign out failed. Try again.");
      setIsSigningOut(false);
    }
  };

  // Auto-run migration for legacy items (one-time check)
  useEffect(() => {
    if (!user || !isTokenReady) return;

    const migrationKey = `migration_v1_${user.uid}`;
    if (localStorage.getItem(migrationKey)) return;

    const runMigration = async () => {
      try {
        console.log("Running auto-migration for legacy items...");
        const count = await firestoreService.fixLegacyData(user.uid);
        if (count > 0) {
          showSuccess(`Fixed ${count} legacy items`, "Your old files are now visible.");
        }
        localStorage.setItem(migrationKey, 'true');
      } catch (e) {
        console.error("Auto-migration failed", e);
      }
    };

    runMigration();
  }, [user, isTokenReady, showSuccess]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName))
        return;
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
        return;
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, goForward]);

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

  const hasItems = folders.length > 0 || files.length > 0;
  const currentCrumb =
    folderHierarchy.length > 0
      ? folderHierarchy[folderHierarchy.length - 1]?.name
      : "Home";

  const totalItems = folders.length + files.length;

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

          {/* ——— NAV CONTROLS + BREADCRUMB (DESKTOP) ——— */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Home"
              onClick={goHome}
              disabled={!canGoHome}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              onClick={goBack}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Forward"
              onClick={goForward}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop breadcrumb */}
          <nav className="hidden sm:block ml-2 truncate text-sm">
            <button
              className="text-muted-foreground hover:underline"
              onClick={() => handleFolderNavigate(null)}
              disabled={currentFolder === null}
            >
              Home
            </button>
            {folderHierarchy.map((f, i) => (
              <span key={f.id} className="text-muted-foreground">
                {" "}
                /{" "}
                <button
                  className={`hover:underline ${i === folderHierarchy.length - 1
                    ? "font-semibold text-foreground"
                    : ""
                    }`}
                  onClick={() => handleFolderNavigate(f)}
                  disabled={i === folderHierarchy.length - 1}
                >
                  {f.name}
                </button>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <MobileStorageIndicator />

          <CreateFolderDialog
            currentFolder={currentFolder}
            onSuccess={handleCreateFolderSuccess}
          >
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <FolderPlus className="h-4 w-4 mr-2" /> New Folder
            </Button>
          </CreateFolderDialog>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleUploadTrigger}
            className="hidden sm:inline-flex"
          >
            Upload
          </Button>

          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />

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
                      alt={getUserDisplayName(user)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground break-all">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/account" aria-label="Go to profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings" aria-label="Go to settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-orange-600 dark:text-orange-400"
                  onSelect={(e: any) => {
                    e.preventDefault();
                    setShowRecycleBin(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Recycle Bin</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  onSelect={(e: any) => {
                    e.preventDefault();
                    handleSignOut();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                  {isSigningOut && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      {/* —— NEW: MOBILE SUB-NAV —— */}
      <div className="sm:hidden sticky top-14 z-40 border-b bg-background/95 backdrop-blur">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Button
            variant="ghost"
            size="sm"
            onClick={goHome}
            aria-label="Go Home"
            disabled={!canGoHome}
            className="shrink-0"
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            aria-label="Go Back"
            disabled={!canGoBack}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goForward}
            aria-label="Go Forward"
            disabled={!canGoForward}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4 mr-1" />
            Forward
          </Button>

          <div className="mx-1 h-6 w-px bg-border shrink-0" />

          <Button
            variant="secondary"
            size="sm"
            onClick={handleUploadTrigger}
            className="shrink-0"
          >
            Upload
          </Button>

          <CreateFolderDialog
            currentFolder={currentFolder}
            onSuccess={handleCreateFolderSuccess}
          >
            <Button variant="default" size="sm" className="shrink-0">
              <FolderPlus className="h-4 w-4 mr-1" />
              New
            </Button>
          </CreateFolderDialog>

          <div className="ml-auto text-xs text-muted-foreground truncate">
            {currentCrumb}
            <span className="mx-1">·</span>
            {totalItems} item{totalItems === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Main fits the rest exactly */}
      <main className="h-[calc(100svh-56px)] supports-[height:100dvh]:h-[calc(100dvh-56px)] px-3 sm:px-4 py-3 overflow-hidden">
        <div className="grid h-full grid-cols-12 gap-3 min-h-0">
          {/* LEFT RAIL */}
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
            {/* Canvas header (48px) - Enhanced with Breadcrumbs */}
            <div className="h-12 min-h-12 flex items-center justify-between gap-2 px-3 sm:px-4 border-b bg-card z-10">
              <div className="flex-1 min-w-0 overflow-hidden">
                <FolderBreadcrumb
                  currentFolder={currentFolder}
                  folderHierarchy={folderHierarchy}
                  onNavigate={handleFolderNavigate}
                  onNavigateToParent={navigateToParent}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                <span className="hidden sm:inline-block">{totalItems} items</span>
                {/* Filter controls or sorting could go here */}
              </div>
            </div>

            {/* Canvas body — Virtualized List handles scrolling */}
            <div
              ref={canvasScrollRef}
              className="flex-1 w-full h-full min-h-0"
            >
              <div className="w-full h-full">
                {dataLoading ? (
                  <LoadingSkeleton viewMode={viewMode} />
                ) : hasItems ? (
                  <FileList
                    files={files as unknown as FileData[]}
                    folders={folders as unknown as FolderData[]}
                    viewMode={viewMode}
                    onFolderOpen={(folder) => handleFolderNavigate(folder)}
                    currentFolder={currentFolder}
                    onLoadMore={loadMoreFiles}
                    hasMore={hasMoreFiles}
                    isLoadingMore={loadingFiles}
                    onRefresh={refresh}
                  />
                ) : (
                  <div className="h-full w-full">
                    <EmptyState
                      currentFolder={currentFolder}
                      onUploadTrigger={handleUploadTrigger}
                      folderHierarchy={folderHierarchy}
                      onNavigateHome={() => handleFolderNavigate(null)}
                      onNavigateToParent={navigateToParent}
                      onNavigateToFolder={(f) => handleFolderNavigate(f)}
                      enableSwipeNavigation
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile action dock */}
      <div
        className="lg:hidden fixed left-0 right-0 z-40 px-3 transition-all duration-200"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
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
          }
        }
        /* Hide scrollbars but keep functionality */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {user && (
        <RecycleBinDialog
          open={showRecycleBin}
          onOpenChange={setShowRecycleBin}
          userId={user.uid}
        />
      )}
    </div>
  );
}
