'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { messaging } from '@/lib/firebaseClient';
import { getToken, onMessage } from 'firebase/messaging';
import { useNotification } from './NotificationProvider';

interface PWAContextType {
    isInstallable: boolean;
    installApp: () => Promise<void>;
    notificationsEnabled: boolean;
    requestNotificationPermission: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
    const context = useContext(PWAContext);
    if (!context) {
        throw new Error('usePWA must be used within a PWAProvider');
    }
    return context;
};

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const { showInfo, showSuccess, showError } = useNotification();

    useEffect(() => {
        // Handle Installation
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
            console.log('PWA: Install prompt deferred');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Initial check for notification permission
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    useEffect(() => {
        // Register foreground message listener
        const setupMessaging = async () => {
            try {
                const msg = await messaging();
                if (msg) {
                    onMessage(msg, (payload) => {
                        console.log('PWA: Foreground message received', payload);
                        if (payload.notification) {
                            showInfo(
                                payload.notification.title || 'New Notification',
                                payload.notification.body || ''
                            );
                        }
                    });
                }
            } catch (err) {
                console.error('PWA: Error setting up messaging', err);
            }
        };

        if (notificationsEnabled) {
            setupMessaging();
        }
    }, [notificationsEnabled, showInfo]);

    const installApp = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: User response to install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            showError('Notifications not supported', 'Your browser does not support push notifications.');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                const msg = await messaging();
                if (msg) {
                    const token = await getToken(msg, {
                        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Ensure this is in .env
                    });
                    console.log('FCM Token:', token);
                    showSuccess('Notifications Enabled', 'You will now receive live updates.');
                    // In a real app, you would send this token to your backend/firestore
                }
            } else {
                showError('Permission Denied', 'Please enable notifications in your browser settings.');
            }
        } catch (err) {
            console.error('PWA: Error requesting notification permission', err);
            showError('Error', 'Failed to request notification permission.');
        }
    };

    return (
        <PWAContext.Provider value={{ isInstallable, installApp, notificationsEnabled, requestNotificationPermission }}>
            {children}
        </PWAContext.Provider>
    );
}
