'use client';

import React, { useEffect, useState } from 'react';
import { usageService } from '@/services/usageService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, TrendingUp, Database, Activity } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { format } from 'date-fns';

export default function CostDashboard() {
    const [stats, setStats] = useState<any[]>([]);
    const [globalStorage, setGlobalStorage] = useState(0);
    const [loading, setLoading] = useState(true);

    const STORAGE_COST_PER_GB = 0.026; // Example Firebase pricing
    const DOWNLOAD_COST_PER_GB = 0.12;
    const OPS_COST_PER_100K = 0.18;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usageData, totalStorage] = await Promise.all([
                usageService.getUsageStats(30),
                usageService.getGlobalStorage()
            ]);
            setStats(usageData);
            setGlobalStorage(totalStorage);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number | undefined) => {
        if (bytes === undefined || bytes === 0) return '0 B';
        const k = 1024;
        const size = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + size[i];
    };

    const calculateEstimatedCost = () => {
        // Simple estimation logic
        const totalStorageGB = globalStorage / (1024 * 1024 * 1024);
        const storageCost = totalStorageGB * STORAGE_COST_PER_GB;

        // Sum up monthly stats
        let totalBandwidth = 0;
        let totalOps = 0;
        stats.forEach(d => {
            totalBandwidth += (d.bandwidthBytes || 0);
            totalOps += (d.reads || 0) + (d.writes || 0);
        });

        const bandwidthGB = totalBandwidth / (1024 * 1024 * 1024);
        const bandwidthCost = bandwidthGB * DOWNLOAD_COST_PER_GB;

        const opsCost = (totalOps / 100000) * OPS_COST_PER_100K;

        return {
            total: (storageCost + bandwidthCost + opsCost).toFixed(4),
            breakdown: {
                storage: storageCost.toFixed(4),
                bandwidth: bandwidthCost.toFixed(4),
                ops: opsCost.toFixed(4)
            }
        };
    };

    const cost = calculateEstimatedCost();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Cost & Usage</h1>
                <Button variant="outline" onClick={loadData}>Refresh</Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estimated Monthly Bill</CardTitle>
                        <span className="text-green-500 font-bold">$</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${cost.total}</div>
                        <p className="text-xs text-muted-foreground">
                            Based on current usage rates
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(globalStorage)}</div>
                        <p className="text-xs text-muted-foreground">
                            ${cost.breakdown.storage} / month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Operations (30d)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.reduce((acc, curr) => acc + (curr.reads || 0) + (curr.writes || 0), 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ${cost.breakdown.ops} estimated cost
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Storage Growth (Bytes)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                    fontSize={12}
                                />
                                <YAxis tickFormatter={(val) => formatBytes(val)} fontSize={12} />
                                <Tooltip formatter={(val: number | undefined) => formatBytes(val)} />
                                <Line type="monotone" dataKey="storageBytes" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Read/Write Operations</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                    fontSize={12}
                                />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="reads" fill="#4ade80" stackId="a" name="Reads" />
                                <Bar dataKey="writes" fill="#f472b6" stackId="a" name="Writes" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Bandwidth Usage</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => format(new Date(val), 'MMM d')}
                                    fontSize={12}
                                />
                                <YAxis tickFormatter={(val) => formatBytes(val)} fontSize={12} />
                                <Tooltip formatter={(val: number | undefined) => formatBytes(val)} />
                                <Line type="monotone" dataKey="bandwidthBytes" stroke="#f59e0b" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
