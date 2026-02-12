'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { firestoreService } from '@/services/firestoreService';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotification } from '@/components/providers/NotificationProvider';
import { Loader2, Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { user } = useAuth();
    const { showSuccess, showError } = useNotification();
    const [migrating, setMigrating] = useState(false);

    const handleMigration = async () => {
        if (!user) return;
        setMigrating(true);
        try {
            const count = await firestoreService.fixLegacyData(user.uid);
            showSuccess(`Fixed ${count} legacy items`);
        } catch (error) {
            console.error(error);
            showError("Migration failed");
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4">
            <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Data Management
                        </CardTitle>
                        <CardDescription>
                            Fix issues with legacy files and folders.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-medium">Fix Legacy Items</h3>
                                <p className="text-sm text-muted-foreground">
                                    Make older files and folders visible by adding missing metadata.
                                </p>
                            </div>
                            <Button onClick={handleMigration} disabled={migrating}>
                                {migrating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {migrating ? 'Fixing...' : 'Run Fix'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
