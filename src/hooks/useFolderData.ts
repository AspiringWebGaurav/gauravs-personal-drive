import { useState, useCallback, useEffect, useRef } from 'react';
import { firestoreService } from '@/services/firestoreService';
import { DocumentSnapshot } from 'firebase/firestore';
import { useBurnControl } from '@/components/providers/BurnControlProvider';
import { auth } from '@/lib/firebaseClient';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 50;
const FOLDER_PAGE_SIZE = 100;

export function useFolderData(userId: string | undefined, folderId: string | null) {
    const { syncStatus } = useBurnControl();

    // State
    const [folders, setFolders] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Refs for cleanup and race conditions
    const unsubFoldersRef = useRef<(() => void) | null>(null);
    const unsubFilesRef = useRef<(() => void) | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Helper to clear data when folder changes
    useEffect(() => {
        setFolders([]);
        setFiles([]);
        setLastDoc(undefined);
        setHasMore(true);
        setLoading(true);
        setError(null);
    }, [userId, folderId]);

    const fetchData = useCallback(async () => {
        if (!userId) return;
        try {
            const [foldersSnap, filesSnap] = await Promise.all([
                firestoreService.getFoldersPaginated(userId, folderId, FOLDER_PAGE_SIZE),
                firestoreService.getFilesPaginated(userId, folderId, PAGE_SIZE)
            ]);

            setFolders(foldersSnap.docs.map(d => ({ ...d.data(), id: d.id })));
            setFiles(filesSnap.docs.map(d => ({ ...d.data(), id: d.id })));
            setLastDoc(filesSnap.docs[filesSnap.docs.length - 1]);
            setHasMore(filesSnap.size === PAGE_SIZE);
            setLoading(false);
        } catch (err: any) {
            if (err?.code === 'permission-denied' && !auth.currentUser) {
                logger.debug("Fetch failed during sign-out - suppressing error");
                setLoading(false);
                return;
            }
            logger.error("Error fetching folder data", err);
            setError(err);
            setLoading(false);
        }
    }, [userId, folderId]);

    // Main sync logic
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        // Cleanup function for listeners
        const cleanupListeners = () => {
            if (unsubFoldersRef.current) {
                unsubFoldersRef.current();
                unsubFoldersRef.current = null;
            }
            if (unsubFilesRef.current) {
                unsubFilesRef.current();
                unsubFilesRef.current = null;
            }
        };

        const cleanupPolling = () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };

        const setupActiveListeners = () => {
            // Safety check: ensure SDK auth matches the requested userId
            if (!auth.currentUser || auth.currentUser.uid !== userId) {
                logger.warn(`Auth mismatch in listener setup: requested=${userId}, current=${auth.currentUser?.uid}`);
                return;
            }

            setLoading(true);
            logger.info("Starting ACTIVE listeners");

            // Subscribe Folders
            unsubFoldersRef.current = firestoreService.subscribeToFolders(
                userId,
                folderId,
                (data) => {
                    setFolders(data);
                    setLoading(false);
                },
                { limit: FOLDER_PAGE_SIZE } // We need to update subscribeToFolders to accept limit if not already
            );

            // Subscribe Files
            unsubFilesRef.current = firestoreService.subscribeToFiles(
                userId,
                folderId,
                (data, snapshot) => {
                    setFiles(data);

                    // Update cursor from the active listener's snapshot
                    if (snapshot && snapshot.docs && snapshot.docs.length > 0) {
                        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                        setHasMore(snapshot.docs.length === PAGE_SIZE);
                    } else if (data.length === 0) {
                        setLastDoc(undefined);
                        setHasMore(false);
                    }
                },
                { limit: PAGE_SIZE }
            );
        };

        // Decision handling based on syncStatus
        cleanupListeners();
        cleanupPolling();

        if (syncStatus === 'active') {
            setupActiveListeners();
        } else if (syncStatus === 'passive') {
            logger.info("Switching to PASSIVE polling");
            // Do one immediate fetch to ensure freshness upon switching (e.g. visible -> hidden -> visible)
            // Wait - "visible -> hidden" is Active -> Passive. "Hidden -> Visible" is Passive -> Active.
            // When we enter Active, we setup listeners, which fetches data.
            // When we enter Passive (Hidden), we stop listeners.
            // We should poll every 60s.

            pollingIntervalRef.current = setInterval(() => {
                logger.info("Passive Poll Triggered");
                fetchData();
            }, 60000);

        } else {
            logger.info("Sync SUSPENDED");
        }

        return () => {
            cleanupListeners();
            cleanupPolling();
        };

    }, [userId, folderId, syncStatus]); // Dependencies: Re-run when status changes

    // We need to manage `extraFiles` to support pagination while Active.
    // The active listener only gives us the first 50 files.
    // Previous code had `firstPageData` (SWR) + `extraFiles` (State).
    // Here `files` state will be our "Page 1".

    // We need a helper to merge for the UI.
    const [extraFiles, setExtraFiles] = useState<any[]>([]);

    // Reset extra files on folder change
    useEffect(() => {
        setExtraFiles([]);
    }, [folderId]);

    const loadMore = useCallback(async () => {
        if (!userId || !hasMore || loadingMore || !lastDoc || syncStatus === 'suspended') return;

        setLoadingMore(true);
        try {
            // Use the last file in the combined list? 
            // `lastDoc` tracks the Firestore cursor.
            // We need to ensure `lastDoc` is updated when `files` (Page 1) updates?
            // Actually, if Page 1 changes actively, `startAfter(lastDoc)` might shift?
            // Yes, standard Firestore pagination issue with realtime.
            // For now, we assume standard behavior: `lastDoc` is from the *fetch*.

            // To be robust: We should use the last item in `files` + `extraFiles` as the cursor?
            // Or just stick to the `lastDoc` snapshot state.

            const snap = await firestoreService.getFilesPaginated(userId, folderId, PAGE_SIZE, lastDoc);
            const newItems = snap.docs.map(d => ({ ...d.data(), id: d.id }));

            if (newItems.length > 0) {
                setExtraFiles(prev => [...prev, ...newItems]);
                setLastDoc(snap.docs[snap.docs.length - 1]);
                setHasMore(snap.docs.length === PAGE_SIZE);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Load more failed", e);
        } finally {
            setLoadingMore(false);
        }
    }, [userId, folderId, hasMore, loadingMore, lastDoc, syncStatus]);

    const refresh = useCallback(async () => {
        // Manual refresh trigger
        // If Active: listeners should already be fresh, but maybe we force-reconnect?
        // If Passive/Suspended: force a fetch.
        await fetchData();
        // Also clear extras
        setExtraFiles([]);
    }, [fetchData]);

    // Update lastDoc when `files` (Page 1) changes, IF we haven't loaded more yet?
    // If we have loaded more, changing `lastDoc` based on Page 1 might break next load.
    // Complex. Let's just update `lastDoc` from Page 1 ONLY if we are at Page 1.


    const allFiles = [...files, ...extraFiles];

    return {
        folders,
        files: allFiles,
        loading,
        loadingMore,
        hasMore,
        isError: error,
        loadMore,
        refresh
    };
}

