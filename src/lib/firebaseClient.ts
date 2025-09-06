import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'
import { getAnalytics } from 'firebase/analytics'
import type { FirebaseConfig } from '@/types'
import { logger } from '@/lib/logger'

// Diagnostic logging for environment variables
logger.firebase('Environment Variables Check')
const envVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

Object.entries(envVars).forEach(([key, value]) => {
  if (!value) {
    logger.error(`Missing environment variable: NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`)
  } else {
    logger.firebase(`${key}: ${value.slice(0, 10)}...`)
  }
})

const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
}

// Initialize Firebase only if it hasn't been initialized already
logger.firebase('Initializing Firebase app...')
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Firebase services
logger.firebase('Initializing Firebase services...')
export const auth = getAuth(app)
export const firestore = getFirestore(app)
export const storage = getStorage(app)
export const database = getDatabase(app)
logger.firebase('Firebase services initialized successfully')

// Initialize Analytics only on client side
let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app)
}

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account',
})

// Production Firebase services - connecting directly to Firebase Cloud
logger.firebase('Using production Firebase services')

export { analytics }
export default app