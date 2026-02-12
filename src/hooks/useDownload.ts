import { useState, useCallback } from 'react';
import { useNotification } from '@/components/providers/NotificationProvider';

interface DownloadOptions {
    filename: string;
    contentType?: string;
    showProgress?: boolean;
}

export function useDownload() {
    const [downloading, setDownloading] = useState<Set<string>>(new Set());
    const { showSuccess, showWarning, showError, showLoading, updateNotification } = useNotification();

    const downloadFile = useCallback(async (url: string, options: DownloadOptions) => {
        const { filename, contentType, showProgress = true } = options;
        if (downloading.has(url)) return;

        setDownloading(prev => new Set(prev).add(url));
        let toastId: string | number | undefined;
        if (showProgress) {
            toastId = showLoading(`Preparing download: ${filename}...`);
        }

        try {
            console.log(`[Download] Starting download for ${filename} (${contentType})`);

            // Strategy: Always try Blob first (Layer 1) to force "Save As" / Download
            // This prevents the browser from opening PDF/Images in a new tab.

            // Layer 1: Fetch as Blob (The "Enterprise" Default)
            try {
                // Check if we can fetch user-friendly
                const response = await fetch(url, { mode: 'cors' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const blob = await response.blob();
                const objectUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();

                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(objectUrl);
                }, 100);

                if (showProgress && toastId) {
                    updateNotification(toastId, { render: `Downloaded: ${filename}`, type: 'success', isLoading: false, autoClose: 2000 });
                } else if (!showProgress) {
                    showSuccess(`Downloaded: ${filename}`);
                }
                return;
            } catch (e) {
                console.warn("[Download] Layer 1 (Blob) failed, trying Layer 2 (Link)", e);
            }

            // Layer 2: Proxy API (Server-Side Force Download)
            // Fallback if CORS blocks Blob fetch or direct link opens in tab
            try {
                console.log("[Download] Layer 1 failed, trying Layer 2 (Proxy)");
                const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

                const a = document.createElement('a');
                a.href = proxyUrl;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                if (toastId) {
                    updateNotification(toastId, { render: `Download started: ${filename}`, type: 'success', isLoading: false, autoClose: 3000 });
                } else {
                    showSuccess(`Download started: ${filename}`);
                }
                return;
            } catch (e) {
                console.warn("[Download] Layer 2 (Proxy) failed", e);
            }

            // Layer 3: New Window Fallback
            // If proxy fails, we have no choice but to open it.
            window.open(url, '_blank');
            if (toastId) {
                updateNotification(toastId, { render: `Opened ${filename} in new tab (proxy failed)`, type: 'warning', isLoading: false, autoClose: 3000 });
            }

        } catch (error: any) {
            console.error("[Download] All download layers failed", error);
            if (toastId) {
                updateNotification(toastId, { render: `Failed to download ${filename}: ${error.message}`, type: 'error', isLoading: false, autoClose: 4000 });
            } else {
                showError(`Failed to download ${filename}: ${error.message}`);
            }
        } finally {
            setDownloading(prev => {
                const next = new Set(prev);
                next.delete(url);
                return next;
            });
        }
    }, [downloading, showSuccess, showWarning, showError, showLoading, updateNotification]);

    return {
        downloadFile,
        isDownloading: (url: string) => downloading.has(url)
    };
}
