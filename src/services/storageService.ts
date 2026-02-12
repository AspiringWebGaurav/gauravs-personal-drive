import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    type UploadTask
} from 'firebase/storage'
import { storage } from '@/lib/firebaseClient'

export const storageService = {
    uploadFileResumable: (path: string, file: File): UploadTask => {
        const storageRef = ref(storage, path);
        return uploadBytesResumable(storageRef, file);
    },

    getDownloadURL: async (path: string): Promise<string> => {
        try {
            const storageRef = ref(storage, path);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error getting download URL:", error);
            throw error;
        }
    },

    deleteFile: async (path: string): Promise<void> => {
        const storageRef = ref(storage, path)
        return deleteObject(storageRef)
    }
}
