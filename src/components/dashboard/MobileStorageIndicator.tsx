"use client";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { HardDrive, AlertTriangle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { MobileStorageModal } from "./MobileStorageModal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

interface MobileStorageIndicatorProps {
  projectId?: string;
  pollMs?: number;
}

export function MobileStorageIndicator({
  projectId = "default",
  pollMs = 5000,
}: MobileStorageIndicatorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadTime, setLastUploadTime] = useState<number>(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [modalOpen, setModalOpen] = useState(false);

  // Adaptive polling - less frequent for mobile indicator
  const activePollMs = useMemo(() => {
    const dt = Date.now() - lastUploadTime;
    if (isUploading) return 2000;
    if (dt < 30000) return 3000;
    return pollMs;
  }, [isUploading, lastUploadTime, pollMs]);

  const { data, mutate, error } = useSWR<QuotaData>(
    `/api/quota?projectId=${projectId}&realtime=true&_t=${Math.floor(
      lastRefreshTime / 30000
    )}`,
    fetcher,
    {
      refreshInterval: activePollMs,
      dedupingInterval: 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    }
  );

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
      setTimeout(() => mutate(), 1000);
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

  // Calculate usage data
  const usedBytes = data?.usedBytes ?? 0;
  const limitBytes = data?.limitBytes ?? 5 * 1024 * 1024 * 1024;
  const isDataValid =
    data &&
    typeof data.usedBytes === "number" &&
    data.usedBytes >= 0 &&
    limitBytes > 0;
    
  const pct = data?.usagePercentage ?? 
    (isDataValid ? Math.min(100, Math.round((usedBytes / Math.max(1, limitBytes)) * 100)) : 0);

  const isNear = pct >= 90 && pct < 100;
  const isAt = pct >= 100;

  // Color and status logic
  const getIndicatorColor = () => {
    if (isAt) return "text-red-500";
    if (isNear) return "text-yellow-500";
    return "text-green-500";
  };

  const getBackgroundColor = () => {
    if (isAt) return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
    if (isNear) return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
    return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
  };

  const handleClick = () => {
    setModalOpen(true);
  };

  return (
    <>
      {/* Mobile-only storage indicator */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={`h-8 px-2 ${getBackgroundColor()} hover:opacity-80 transition-all`}
          title="Storage usage - tap for details"
        >
          <div className="flex items-center gap-1.5">
            <HardDrive 
              className={`h-3.5 w-3.5 ${
                isUploading ? "animate-pulse" : ""
              } ${getIndicatorColor()}`} 
            />
            <span className={`text-xs font-medium tabular-nums ${getIndicatorColor()}`}>
              {!isDataValid ? "—" : `${pct}%`}
            </span>
            {(isNear || isAt) && (
              <AlertTriangle 
                className={`h-3 w-3 ${isAt ? "text-red-500" : "text-yellow-500"}`}
              />
            )}
          </div>
        </Button>
      </div>

      {/* Mobile Storage Modal */}
      <MobileStorageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        data={data}
        error={error}
        isUploading={isUploading}
        onRefresh={() => {
          setLastRefreshTime(Date.now());
          mutate();
        }}
      />
    </>
  );
}