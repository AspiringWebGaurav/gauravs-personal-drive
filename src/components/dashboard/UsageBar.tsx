"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { HardDrive, AlertTriangle, RefreshCw, Loader2, Cloud, Zap, Sparkles } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UsageBarProps {
  projectId?: string;
  pollMs?: number;
}

interface QuotaData {
  projectId: string;
  monthKey: string;
  usedBytes: number;
  limitBytes: number;
  usedPhysicalBytes: number;
  deletedBytesAccrued: number;
  resetAt: string;
  calculationMethod?: string;
  timestamp?: string;
  usagePercentage?: number;
  usageFormatted?: {
    usedMB: number;
    limitMB: number;
    physicalMB: number;
    deletedMB: number;
  };
  debug?: any;
}

import { useBurnControl } from "@/components/providers/BurnControlProvider";

export function UsageBar({
  projectId = "default",
  pollMs = 2000,
}: UsageBarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadTime, setLastUploadTime] = useState<number>(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [open, setOpen] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const { syncStatus } = useBurnControl();

  // Adaptive polling
  const activePollMs = useMemo(() => {
    if (syncStatus === 'suspended' || syncStatus === 'passive') return 0; // Pause polling

    const dt = Date.now() - lastUploadTime;
    if (isUploading) return 1000;
    if (dt < 30000) return 2000;
    if (dt < 120000) return 5000;
    return pollMs;
  }, [isUploading, lastUploadTime, pollMs, syncStatus]);

  const { data, mutate, error, isValidating } = useSWR<QuotaData>(
    `/api/quota?projectId=${projectId}&realtime=true&_t=${Math.floor(
      lastRefreshTime / 30000
    )}`,
    fetcher,
    {
      refreshInterval: activePollMs,
      dedupingInterval: process.env.NODE_ENV === "development" ? 0 : 500,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      onError: (e) => console.error("📊 UsageBar SWR error:", e),
    }
  );

  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);

    // Ensure animation runs for at least 800ms for better UX
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));

    try {
      setLastRefreshTime(Date.now());

      const refreshPromise = async () => {
        await mutate();
        await fetch(
          `/api/quota?projectId=${projectId}&realtime=true&_t=${Date.now()}`
        ).then((r) => r.json());
      };

      await Promise.all([refreshPromise(), minDelay]);

    } catch (e) {
      console.error("❌ Manual refresh failed:", e);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Upload/file events
  useEffect(() => {
    const onUploadStart = () => {
      setIsUploading(true);
      setLastUploadTime(Date.now());
    };
    const onUploadComplete = () => {
      setIsUploading(false);
      setLastUploadTime(Date.now());
      mutate();
    };
    const onFileOp = () => {
      setLastUploadTime(Date.now());
      setTimeout(() => mutate(), 500);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "quota:update") mutate();
    };

    window.addEventListener("upload:start", onUploadStart);
    window.addEventListener("upload:complete", onUploadComplete);
    window.addEventListener("file:operation", onFileOp);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("upload:start", onUploadStart);
      window.removeEventListener("upload:complete", onUploadComplete);
      window.removeEventListener("file:operation", onFileOp);
      window.removeEventListener("storage", onStorage);
    };
  }, [mutate]);

  // Data
  const usedBytes = data?.usedBytes ?? 0;
  const limitBytes = data?.limitBytes ?? 5 * 1024 * 1024 * 1024;
  const resetAt = data?.resetAt;
  const usedPhysicalBytes = data?.usedPhysicalBytes ?? 0;
  const deletedBytesAccrued = data?.deletedBytesAccrued ?? 0;

  const isDataValid =
    data &&
    typeof data.usedBytes === "number" &&
    data.usedBytes >= 0 &&
    limitBytes > 0;

  const pct =
    data?.usagePercentage ??
    (isDataValid
      ? Math.min(100, Math.max(0, (usedBytes / Math.max(1, limitBytes)) * 100))
      : 0);

  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  const isNear = pct >= 90 && pct < 100;
  const isAt = pct >= 100;

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500 shadow-red-500/50';
    if (percentage >= 75) return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-blue-500/50';
  };

  const getUsageStatusText = (percentage: number) => {
    if (percentage >= 90) return 'Critical Storage';
    if (percentage >= 75) return 'Running Low';
    return 'Storage Available';
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Cloud className="w-4 h-4" />
          </div>
          <span>Storage</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className={`h-7 w-7 p-0 rounded-full transition-all duration-300 ${isManualRefreshing
              ? "bg-primary/10 text-primary ring-2 ring-primary/20"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            title="Refresh quota data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 transition-all duration-300 ${isManualRefreshing ? 'animate-spin' : ''
                }`}
            />
          </Button>
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/50">
            Free Plan
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:bg-white/60 dark:hover:bg-black/30 group">

        {/* Loading/Action Overlay */}
        <AnimatePresence>
          {(isValidating && !isManualRefreshing && !isUploading) && (
            <div className="absolute top-2 right-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>
          )}
        </AnimatePresence>

        <div className="space-y-4 relative z-10">
          {/* Usage Text & Value */}
          <div className="flex items-end justify-between">
            <div className="space-y-0.5">
              <p className={`text-xs font-medium ${pct >= 90 ? 'text-red-500' :
                pct >= 75 ? 'text-amber-500' :
                  'text-muted-foreground'
                }`}>
                {isUploading ? 'Uploading...' : getUsageStatusText(pct)}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {formatBytes(usedBytes)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  / {formatBytes(limitBytes)}
                </span>
              </div>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-muted/30 border border-border/50 text-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors cursor-help"
                    onClick={() => setOpen(true)}
                  >
                    {pct >= 90 ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <HardDrive className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Click for details. Used {pct.toFixed(1)}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Animated Progress Bar */}
          <div className="relative h-3 w-full bg-muted/40 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
            <motion.div
              className={`h-full rounded-full ${getUsageColor(pct)}`}
              initial={{ width: 0 }}
              animate={{ width: `${animatedProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 w-full h-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" />
            </motion.div>
          </div>

          {/* Upgrade Call to Action */}
          {(isNear || isAt) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={() => setOpen(true)}
                className="w-full mt-2 relative overflow-hidden group bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-0 shadow-lg shadow-primary/20"
                size="sm"
                variant="default"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAt ? 'Manage Storage' : 'Upgrade Plan'}
                </span>
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/40 blur-sm group-hover:h-full group-hover:opacity-20 transition-all duration-300" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mini Stats Config */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-muted/10 border border-border/40 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</span>
          <span className="text-sm font-semibold text-foreground/80">
            {isDataValid ? 'Active' : 'Offline'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/10 border border-border/40 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Optimization</span>
          <div className="flex items-center gap-1 text-green-500 font-medium text-sm">
            <Zap className="w-3 h-3 fill-current" />
            <span>On</span>
          </div>
        </div>
      </div>

      {/* Details dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle>Free plan quota</DialogTitle>
            <DialogDescription>
              Deletions still count toward this month&apos;s billable usage. Quotas
              reset monthly.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <div className="flex justify-between tabular-nums">
              <span>Physical storage</span>
              <span>{formatBytes(usedPhysicalBytes)}</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Deleted (this month)</span>
              <span>{formatBytes(deletedBytesAccrued)}</span>
            </div>
            <hr className="my-2 border-white/10" />
            <div className="flex justify-between font-medium tabular-nums">
              <span>Billable usage</span>
              <span>{formatBytes(usedBytes)}</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Limit</span>
              <span>{formatBytes(limitBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Resets</span>
              <span>
                {resetAt ? new Date(resetAt).toLocaleString() : "—"}
              </span>
            </div>

            {/* Debug Info */}
            {process.env.NODE_ENV === "development" && (
              <>
                {data?.debug && (
                  <div className="mt-2 text-[11px] opacity-70 font-mono bg-black/10 p-2 rounded">
                    Files: {data.debug.validFiles}/{data.debug.totalFiles}
                    {data.debug.invalidFiles > 0 && (
                      <span className="text-red-500">
                        {" "}
                        ({data.debug.invalidFiles} invalid)
                      </span>
                    )}
                  </div>
                )}
                {error && (
                  <div className="text-red-500 text-[11px]">
                    Error: {error.message}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              size="default"
              asChild
            >
              <a
                href="https://firebase.google.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pricing
              </a>
            </Button>
            <Button
              variant="default"
              size="default"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
