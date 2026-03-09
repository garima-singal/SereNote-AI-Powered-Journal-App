import { db } from './config'
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import type { UserProfile, UserSettings } from '@/types/user'

// ── CREATE USER DOC ──────────────────────────────────────────
// Called after every login — only creates if doesn't exist yet
export const createUserDocument = async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    // Skip if document already exists — don't overwrite on every login
    if (userSnap.exists()) return

    await setDoc(userRef, {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        createdAt: serverTimestamp(),
        streak: 0,
        bestStreak: 0,
        totalEntries: 0,
        settings: {
            theme: 'light',
            fontSize: 'md',
            fontFamily: 'lora',
            notificationsEnabled: false,
            reminderTime: '21:00',
            aiOptIn: false,
        },
    })
}

// ── GET USER ─────────────────────────────────────────────────
export const getUserProfile = async (
    uid: string
): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) return null
    return { uid, ...userSnap.data() } as UserProfile
}

// ── UPDATE SETTINGS ──────────────────────────────────────────
export const updateUserSettings = async (
    uid: string,
    settings: Partial<UserSettings>
): Promise<void> => {
    const userRef = doc(db, 'users', uid)
    // dot notation updates nested fields without overwriting the whole object
    const updates = Object.fromEntries(
        Object.entries(settings).map(([k, v]) => [`settings.${k}`, v])
    )
    await updateDoc(userRef, updates)
}

// ── UPDATE STREAK ─────────────────────────────────────────────
export const updateStreak = async (
    uid: string,
    streak: number,
    bestStreak: number
): Promise<void> => {
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, { streak, bestStreak })
}