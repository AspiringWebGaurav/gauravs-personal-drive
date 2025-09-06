"use client";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { HardDrive, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

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
}

export function UsageBar({
  projectId = "default",
  pollMs = 10000,
}: UsageBarProps) {
  const { data } = useSWR<QuotaData>(
    `/api/quota?projectId=${projectId}`,
    fetcher,
    { refreshInterval: pollMs }
  );
  const [open, setOpen] = useState(false);

  const usedBytes = data?.usedBytes || 0;
  const limitBytes = data?.limitBytes || 5 * 1024 * 1024 * 1024;
  const resetAt = data?.resetAt;
  const usedPhysicalBytes = data?.usedPhysicalBytes || 0;
  const deletedBytesAccrued = data?.deletedBytesAccrued || 0;

  const pct = Math.min(
    100,
    Math.round((usedBytes / Math.max(1, limitBytes)) * 100)
  );
  const isNear = pct >= 90 && pct < 100;
  const isAt = pct >= 100;

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Card className="glass-card border-white/20 dark:border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Storage Usage</span>
            {(isNear || isAt) && (
              <AlertTriangle
                className={`h-4 w-4 ${
                  isAt ? "text-red-500" : "text-yellow-500"
                }`}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
            </div>
            <Button
              className=""
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
            >
              Limits
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{pct}% used</span>
            {isAt ? (
              <span className="text-red-600 dark:text-red-400 font-medium">
                Storage full
              </span>
            ) : isNear ? (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                Almost full
              </span>
            ) : (
              <span className="text-green-600 dark:text-green-400">
                {formatBytes(limitBytes - usedBytes)} remaining
              </span>
            )}
          </div>
        </div>

        {(isNear || isAt) && (
          <div
            className={`mt-3 p-3 rounded-lg border ${
              isAt
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle
                className={`h-5 w-5 ${
                  isAt
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
                } flex-shrink-0 mt-0.5`}
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
                      You've reached the free‑plan storage quota. Uploads are
                      blocked until reset (
                      {resetAt ? new Date(resetAt).toLocaleString() : "—"}).
                    </>
                  ) : (
                    <>
                      You're approaching the free‑plan quota. Consider freeing
                      up space or upgrading.
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    className=""
                    size="sm"
                    variant="outline"
                    onClick={() => setOpen(true)}
                  >
                    View details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="">
              <DialogTitle className="">Free plan quota</DialogTitle>
              <DialogDescription className="">
                Deletions still count toward this month's billable usage. Quotas
                reset monthly.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Physical storage</span>
                <span>{formatBytes(usedPhysicalBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Deleted (this month)</span>
                <span>{formatBytes(deletedBytesAccrued)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Billable usage</span>
                <span>{formatBytes(usedBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Limit</span>
                <span>{formatBytes(limitBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Resets</span>
                <span>
                  {resetAt ? new Date(resetAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>
            <DialogFooter className="">
              <Button className="" variant="secondary" size="default" asChild>
                <a
                  href="https://firebase.google.com/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pricing
                </a>
              </Button>
              <Button
                className=""
                variant="default"
                size="default"
                onClick={() => setOpen(false)}
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
