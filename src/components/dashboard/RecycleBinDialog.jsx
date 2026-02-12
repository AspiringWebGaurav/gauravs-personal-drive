import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { firestoreService } from '@/services/firestoreService';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, RefreshCw, FileText, Folder, AlertTriangle, Loader2 } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';


export function RecycleBinDialog({ open, onOpenChange, userId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cleanupLoading, setCleanupLoading] = useState(false);
    const [restoringIds, setRestoringIds] = useState(new Set());
    const { showSuccess, showError } = useNotification();

    // Confirmation State
    const [confirmState, setConfirmState] = useState({
        open: false,
        type: 'delete', // 'delete', 'empty'
        title: '',
        description: '',
        item: null,
        onConfirm: () => { }
    });

    const loadItems = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [files, folders] = await Promise.all([
                firestoreService.getTrashedFiles(userId),
                firestoreService.getTrashedFolders(userId)
            ]);

            const allItems = [
                ...folders.map(f => ({ ...f, type: 'folder' })),
                ...files.map(f => ({ ...f, type: 'file' }))
            ].sort((a, b) => b.trashedAt?.seconds - a.trashedAt?.seconds);

            setItems(allItems);
        } catch (error) {
            console.error("Failed to load recycle bin", error);
            showError("Failed to load trashed items");
        } finally {
            setLoading(false);
        }
    }, [userId, showError]);

    useEffect(() => {
        if (open) {
            loadItems();
            // Trigger lazy cleanup check
            if (userId) {
                firestoreService.cleanupExpiredTrash(userId).then(count => {
                    if (count > 0) {
                        showSuccess(`Auto-cleaned ${count} expired items`);
                        loadItems(); // Reload if items were removed
                    }
                });
            }
        }
    }, [open, userId, loadItems, showSuccess]);

    const handleRestore = async (item) => {
        if (restoringIds.has(item.id)) return;

        setRestoringIds(prev => new Set(prev).add(item.id));
        try {
            if (item.type === 'folder') {
                await firestoreService.restoreFolder(item.id);
            } else {
                await firestoreService.restoreFile(item.id);
            }
            showSuccess("Item restored");
            setItems(prev => prev.filter(i => i.id !== item.id));
            window.dispatchEvent(new CustomEvent('quota:update')); // Update UI if needed
        } catch (error) {
            showError("Failed to restore item");
            console.error(error);
        } finally {
            setRestoringIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };

    // Trigger Delete Dialog
    const handlePermanentDeleteClick = (item) => {
        setConfirmState({
            open: true,
            type: 'delete',
            title: 'Permanently Delete?',
            description: `Are you sure you want to permanently delete "${item.name || item.filename}"? This action cannot be undone.`,
            item: item,
            onConfirm: () => performPermanentDelete(item)
        });
    };

    const performPermanentDelete = async (item) => {
        setCleanupLoading(true);
        try {
            if (item.type === 'folder') {
                await firestoreService.deleteFolderRecursively(item.id, userId);
            } else {
                if (item.storagePath) {
                    const { storageService } = await import('@/services/storageService');
                    await storageService.deleteFile(item.storagePath).catch(err => console.warn(err));
                }
                await firestoreService.deleteFile(item.id);
            }
            showSuccess("Item permanently deleted");
            setItems(prev => prev.filter(i => i.id !== item.id));
            window.dispatchEvent(new CustomEvent('quota:update'));
            setConfirmState(prev => ({ ...prev, open: false }));
        } catch (error) {
            showError("Failed to delete item");
        } finally {
            setCleanupLoading(false);
        }
    };

    // Trigger Empty Bin Dialog
    const handleEmptyBinClick = () => {
        setConfirmState({
            open: true,
            type: 'empty',
            title: 'Empty Recycle Bin?',
            description: 'Are you sure you want to permanently delete ALL items in the Recycle Bin? This action cannot be undone.',
            item: null,
            onConfirm: performEmptyBin
        });
    };

    const performEmptyBin = async () => {
        setCleanupLoading(true);
        try {
            const deletePromises = [];
            const { storageService } = await import('@/services/storageService');

            for (const item of items) {
                if (item.type === 'folder') {
                    deletePromises.push(firestoreService.deleteFolder(item.id));
                } else {
                    if (item.storagePath) {
                        deletePromises.push(storageService.deleteFile(item.storagePath).catch(() => { }));
                    }
                    deletePromises.push(firestoreService.deleteFile(item.id));
                }
            }

            await Promise.all(deletePromises);
            setItems([]);
            showSuccess("Recycle Bin emptied");
            window.dispatchEvent(new CustomEvent('quota:update'));
            setConfirmState(prev => ({ ...prev, open: false }));
        } catch (error) {
            showError("Failed to empty bin");
        } finally {
            setCleanupLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        Recycle Bin
                    </DialogTitle>
                    <DialogDescription className="text-base ml-1">
                        Items are automatically deleted after 5 days.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px] bg-muted/5">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <div className="p-4 rounded-full bg-muted/30">
                                <Trash2 className="w-12 h-12 opacity-20" />
                            </div>
                            <p className="text-lg font-medium">Recycle Bin is empty</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-3">
                                {items.map((item) => (
                                    <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 hover:shadow-sm transition-all duration-200">
                                        <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                                            <div className={`p-3 rounded-xl border ${item.type === 'folder' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                                                {item.type === 'folder' ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold truncate text-foreground mb-0.5">{item.name || item.filename}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span>Deleted {item.trashedAt ? formatDistanceToNow(item.trashedAt.toDate(), { addSuffix: true }) : 'Unknown'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full"
                                                onClick={() => handleRestore(item)}
                                                disabled={restoringIds.has(item.id) || cleanupLoading}
                                                title="Restore"
                                            >
                                                {restoringIds.has(item.id) ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                                onClick={() => handlePermanentDeleteClick(item)}
                                                disabled={restoringIds.has(item.id) || cleanupLoading}
                                                title="Delete Permanently"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-background/50 backdrop-blur-sm gap-3 sm:gap-4 flex-col-reverse sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                    >
                        Close
                    </Button>
                    {items.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleEmptyBinClick}
                            disabled={cleanupLoading}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                        >
                            {cleanupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                            Empty Bin
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>

            <ConfirmDialog
                open={confirmState.open}
                onOpenChange={(isOpen) => setConfirmState(prev => ({ ...prev, open: isOpen }))}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                confirmText="Permanently Delete"
                isLoading={cleanupLoading}
            />
        </Dialog>
    );
}
