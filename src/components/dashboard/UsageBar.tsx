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
import { HardDrive, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

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

export function UsageBar({
  projectId = "default",
  pollMs = 2000,
}: UsageBarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadTime, setLastUploadTime] = useState<number>(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [open, setOpen] = useState(false);

  // Adaptive polling
  const activePollMs = useMemo(() => {
    const dt = Date.now() - lastUploadTime;
    if (isUploading) return 1000;
    if (dt < 30000) return 2000;
    if (dt < 120000) return 5000;
    return pollMs;
  }, [isUploading, lastUploadTime, pollMs]);

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
    setIsManualRefreshing(true);
    try {
      setLastRefreshTime(Date.now());
      await mutate();
      await fetch(
        `/api/quota?projectId=${projectId}&realtime=true&_t=${Date.now()}`
      ).then((r) => r.json());
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
      ? Math.min(100, Math.round((usedBytes / Math.max(1, limitBytes)) * 100))
      : 0);

  const isNear = pct >= 90 && pct < 100;
  const isAt = pct >= 100;

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Status text width reservation (prevents layout shifts)
  const STATUS_SLOT_W = "w-[120px]";
  const status = isUploading
    ? "• Uploading..."
    : isManualRefreshing
    ? "• Refreshing..."
    : isValidating
    ? "• Loading..."
    : !isDataValid
    ? "• No data"
    : "";

  return (
    <Card className="glass-card border-white/20 dark:border-white/10">
      <CardContent className="p-4">
        {/* Top row: content-first layout (not strictly symmetric) */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <HardDrive
              className={`h-4 w-4 ${
                isUploading
                  ? "text-blue-500 animate-pulse"
                  : "text-muted-foreground"
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">Storage Usage</span>
            {(isNear || isAt) && (
              <AlertTriangle
                className={`h-4 w-4 ${
                  isAt ? "text-red-500" : "text-yellow-500"
                }`}
                aria-label={isAt ? "Quota full" : "Quota almost full"}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh quota data"
              aria-label="Refresh"
            >
              {isManualRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="min-w-[88px] justify-center"
              onClick={() => setOpen(true)}
            >
              Limits
            </Button>
          </div>
        </div>

        {/* Stats line: emphasis on readability, balanced columns on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:items-end gap-1 md:gap-2 mb-2">
          <div className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
            <span className="font-medium text-foreground">
              {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
            </span>
            <div className="text-[11px] opacity-70 leading-tight">
              real-time
            </div>
          </div>

          <div className={`text-sm ${STATUS_SLOT_W} md:justify-self-center`}>
            {/* reserve width so nothing jumps */}
            <span className="invisible">{status || "• Loading..."}</span>
            <span className="absolute tabular-nums">
              {status && (
                <span
                  className={
                    isUploading
                      ? "text-blue-500"
                      : isManualRefreshing
                      ? "text-orange-500"
                      : isValidating
                      ? "text-blue-400"
                      : "text-red-400"
                  }
                >
                  {status}
                </span>
              )}
            </span>
          </div>

          <div className="md:justify-self-end text-sm">
            {isAt ? (
              <span className="text-red-600 dark:text-red-400 font-medium">
                Storage full
              </span>
            ) : isNear ? (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                Almost full
              </span>
            ) : null}
          </div>
        </div>

        {/* Banner when near/full */}
        {(isNear || isAt) && (
          <div
            className={`mt-3 p-3 rounded-lg border ${
              isAt
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  isAt
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              />
              <div className="flex-1 space-y-2">
                <p
                  className={`text-sm ${
                    isAt
                      ? "text-red-800 dark:text-red-200"
                      : "text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {isAt ? (
                    <>
                      You've reached the free-plan storage quota. Uploads are
                      blocked until reset (
                      {resetAt ? new Date(resetAt).toLocaleString() : "—"}).
                    </>
                  ) : (
                    <>
                      You're approaching the free-plan quota. Consider freeing
                      up space or upgrading.
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(true)}
                    className={undefined}
                  >
                    View details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className={undefined}>
              <DialogTitle className={undefined}>Free plan quota</DialogTitle>
              <DialogDescription className={undefined}>
                Deletions still count toward this month's billable usage. Quotas
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
              <hr className="my-2" />
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

              {process.env.NODE_ENV === "development" && (
                <>
                  {data?.debug && (
                    <div className="mt-2 text-[11px] opacity-70 font-mono">
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
            <DialogFooter className={undefined}>
              <Button
                variant="secondary"
                asChild
                className={undefined}
                size={undefined}
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
                onClick={() => setOpen(false)}
                className={undefined}
                size={undefined}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
