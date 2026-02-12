'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Share2, Download, X, Copy, Trash2, ExternalLink } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationProvider';
import { useDownload } from '@/hooks/useDownload';

interface MobileActionsProps {
    file: any;
    children: React.ReactNode;
    onDelete?: () => void;
    onRename?: () => void;
}

export function MobileActions({ file, children, onDelete, onRename }: MobileActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { showSuccess, showError } = useNotification();
    const { downloadFile } = useDownload();

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: file.filename,
                    text: `Check out ${file.filename}`,
                    url: file.downloadURL,
                });
                showSuccess('Shared successfully');
            } catch (error) {
                console.error('Error sharing', error);
            }
        } else {
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(file.downloadURL);
                showSuccess('Link copied to clipboard');
            } catch (err) {
                showError('Failed to copy link');
            }
        }
        setIsOpen(false);
    };

    const handleSaveToDevice = async () => {
        if (file.downloadURL) {
            await downloadFile(file.downloadURL, {
                filename: file.filename,
                contentType: file.contentType
            });
        }
        setIsOpen(false);
    };

    const handleOpenNewTab = () => {
        window.open(file.downloadURL, '_blank');
        setIsOpen(false);
    }

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            {/* @ts-ignore */}
            <DrawerContent className="p-0 border-t-0 rounded-t-[20px] bg-background/95 backdrop-blur-xl">
                {/* @ts-ignore */}
                <DrawerDescription className="sr-only">Mobile Actions</DrawerDescription>
                <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted/60 my-3" />
                {/* @ts-ignore */}
                <DrawerHeader>
                    {/* @ts-ignore */}
                    <DrawerTitle className="truncate pr-4">{file.filename}</DrawerTitle>
                    {/* @ts-ignore */}
                    <DrawerDescription>
                        Choose an action for this file.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                    <Button
                        variant="default"
                        className="w-full flex items-center justify-start gap-3"
                        size="lg"
                        onClick={handleShare}
                    >
                        <Share2 className="w-5 h-5" />
                        Share / Copy Link
                    </Button>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="secondary"
                            className="w-full flex items-center justify-start gap-3"
                            size="lg"
                            onClick={handleOpenNewTab}
                        >
                            <ExternalLink className="w-5 h-5" />
                            Open Tab
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full flex items-center justify-start gap-3"
                            size="lg"
                            onClick={handleSaveToDevice}
                        >
                            <Download className="w-5 h-5" />
                            Save
                        </Button>
                    </div>

                    {onRename && (
                        <Button
                            variant="secondary"
                            className="w-full flex items-center justify-start gap-3"
                            size="lg"
                            onClick={() => { setIsOpen(false); onRename(); }}
                        >
                            <Copy className="w-5 h-5" />
                            Rename
                        </Button>
                    )}

                    {onDelete && (
                        <Button
                            variant="destructive"
                            className="w-full flex items-center justify-start gap-3 bg-red-500 hover:bg-red-600 text-white"
                            size="lg"
                            onClick={() => { setIsOpen(false); onDelete(); }}
                        >
                            <Trash2 className="w-5 h-5" />
                            Move to Trash
                        </Button>
                    )}
                </div>
                <DrawerFooter>
                    <DrawerClose asChild>
                        <Button variant="outline" size="default">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
