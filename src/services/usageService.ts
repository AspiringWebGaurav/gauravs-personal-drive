import {
    collection,
    doc,
    setDoc,
    increment,
    serverTimestamp,
    updateDoc,
    getDoc,
    query,
    where,
    orderBy,
    getDocs
} from 'firebase/firestore';
import { firestore } from '@/lib/firebaseClient';

interface DailyUsage {
    date: string; // YYYY-MM-DD
    storageBytes: number;
    bandwidthBytes: number;
    reads: number;
    writes: number;
    downloads: number;
}

export const usageService = {
    // Helper to get today's date string YYYY-MM-DD
    getTodayStr: () => new Date().toISOString().split('T')[0],

    async trackOperation(type: 'read' | 'write', count: number = 1) {
        const today = usageService.getTodayStr();
        const docRef = doc(firestore, 'usage_stats', today);

        try {
            await updateDoc(docRef, {
                [type === 'read' ? 'reads' : 'writes']: increment(count),
                updatedAt: serverTimestamp()
            });
        } catch (error: any) {
            // If doc doesn't exist, create it (atomic upsert not native to client SDK in one go without transaction, 
            // but setDoc with merge is good)
            if (error.code === 'not-found' || type) { // Catching generic for safety
                await setDoc(docRef, {
                    date: today,
                    storageBytes: 0, // Initialize defaults
                    bandwidthBytes: 0,
                    reads: type === 'read' ? count : 0,
                    writes: type === 'write' ? count : 0,
                    downloads: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        }
    },

    async trackStorage(bytesDelta: number) {
        const today = usageService.getTodayStr();
        const docRef = doc(firestore, 'usage_stats', today);
        // Also update a global "total used" counter if needed, but for now we track daily delta
        // NOTE: For exact total storage, we might need a separate singleton document.
        // Let's also track a 'global_stats' document.

        const globalRef = doc(firestore, 'usage_stats', 'global_total');

        try {
            // Upadte daily delta (not very useful for storage, but good for activity)
            await setDoc(docRef, {
                date: today,
                writes: increment(1), // treat as a write op too
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Update global total
            await setDoc(globalRef, {
                totalStorageBytes: increment(bytesDelta),
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Failed to track storage usage", error);
        }
    },

    async trackBandwidth(bytes: number) {
        const today = usageService.getTodayStr();
        const docRef = doc(firestore, 'usage_stats', today);

        try {
            await setDoc(docRef, {
                date: today,
                bandwidthBytes: increment(bytes),
                downloads: increment(1),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Failed to track bandwidth", error);
        }
    },

    async getUsageStats(days: number = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const q = query(
            collection(firestore, 'usage_stats'),
            where('date', '>=', startDate.toISOString().split('T')[0]),
            orderBy('date', 'asc')
        );

        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as DailyUsage);
    },

    async getGlobalStorage() {
        const globalRef = doc(firestore, 'usage_stats', 'global_total');
        const snap = await getDoc(globalRef);
        if (snap.exists()) {
            return snap.data().totalStorageBytes || 0;
        }
        return 0;
    }
};
