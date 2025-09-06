"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HardDrive, AlertTriangle, RefreshCw, Loader2, X } from "lucide-react";

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

interface MobileStorageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: QuotaData;
  error?: any;
  isUploading: boolean;
  onRefresh: () => void;
}

export function MobileStorageModal({
  open,
  onOpenChange,
  data,
  error,
  isUploading,
  onRefresh,
}: MobileStorageModalProps) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error("❌ Manual refresh failed:", e);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 1000);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Data calculations
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

  const getStatusColor = () => {
    if (isAt) return "text-red-500";
    if (isNear) return "text-yellow-500";
    return "text-green-500";
  };

  const getStatusText = () => {
    if (isUploading) return "• Uploading...";
    if (isManualRefreshing) return "• Refreshing...";
    if (!isDataValid) return "• No data";
    if (isAt) return "• Storage full";
    if (isNear) return "• Almost full";
    return "• Available";
  };

  const getProgressBarColor = () => {
    if (isAt) return "bg-red-500";
    if (isNear) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-0">
          {/* Custom header with close button */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b">
            <div className="flex items-center gap-3">
              <HardDrive
                className={`h-5 w-5 ${
                  isUploading ? "text-blue-500 animate-pulse" : getStatusColor()
                }`}
              />
              <div>
                <h2 className="text-lg font-semibold">Storage Usage</h2>
                <p className="text-sm text-muted-foreground">
                  Free plan quota details
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Main content */}
          <div className="p-4 space-y-4">
            {/* Usage overview */}
            <Card className="glass-card border-white/20 dark:border-white/10">
              <CardContent className="p-4">
                {/* Usage stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Usage</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleManualRefresh}
                        disabled={isManualRefreshing}
                        className="h-7 w-7 p-0"
                      >
                        {isManualRefreshing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold">
                        {formatBytes(usedBytes)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        of {formatBytes(limitBytes)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className={`font-medium ${getStatusColor()}`}>
                        {pct}% used
                      </span>
                      <span className={getStatusColor()}>
                        {getStatusText()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning banner for high usage */}
                {(isNear || isAt) && (
                  <div
                    className={`mt-4 p-3 rounded-lg border ${
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
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            isAt
                              ? "text-red-800 dark:text-red-200"
                              : "text-yellow-800 dark:text-yellow-200"
                          }`}
                        >
                          {isAt ? (
                            <>
                              You've reached your storage quota. Uploads are
                              blocked until reset (
                              {resetAt ? new Date(resetAt).toLocaleString() : "—"}).
                            </>
                          ) : (
                            <>
                              You're approaching your storage quota. Consider freeing
                              up space or upgrading.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed breakdown */}
            <Card className="glass-card border-white/20 dark:border-white/10">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Storage Breakdown</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between tabular-nums">
                    <span className="text-muted-foreground">Physical storage</span>
                    <span>{formatBytes(usedPhysicalBytes)}</span>
                  </div>
                  <div className="flex justify-between tabular-nums">
                    <span className="text-muted-foreground">Deleted (this month)</span>
                    <span>{formatBytes(deletedBytesAccrued)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium tabular-nums">
                    <span>Billable usage</span>
                    <span>{formatBytes(usedBytes)}</span>
                  </div>
                  <div className="flex justify-between tabular-nums">
                    <span className="text-muted-foreground">Limit</span>
                    <span>{formatBytes(limitBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resets</span>
                    <span className="text-right">
                      {resetAt ? new Date(resetAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => setLimitsDialogOpen(true)}
                className="w-full"
              >
                View Limits & Upgrade Options
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={handleClose}
                className="w-full"
              >
                Close
              </Button>
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV === "development" && (
              <Card className="glass-card border-white/20 dark:border-white/10">
                <CardContent className="p-3">
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Debug Info</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {data?.debug && (
                      <div>
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
                      <div className="text-red-500">
                        Error: {error.message}
                      </div>
                    )}
                    <div>Last update: {data?.timestamp || "—"}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Limits Dialog */}
      <Dialog open={limitsDialogOpen} onOpenChange={setLimitsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="">
            <DialogTitle className="">Storage Limits</DialogTitle>
            <DialogDescription className="">
              Current plan limits and upgrade options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="font-medium">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Limit</span>
                <span className="font-medium">{formatBytes(limitBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reset Period</span>
                <span className="font-medium">Monthly</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Deletions still count toward this month's billable usage. 
              Quotas reset monthly on your billing date.
            </p>
          </div>
          <DialogFooter className="">
            <Button
              variant="secondary"
              size="default"
              className=""
              asChild
            >
              <a
                href="https://firebase.google.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Pricing
              </a>
            </Button>
            <Button
              variant="default"
              size="default"
              className=""
              onClick={() => setLimitsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}