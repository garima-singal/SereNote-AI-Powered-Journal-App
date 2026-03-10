import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    where,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Entry } from '@/types/entry'

// Helper — converts a Firestore doc snapshot into our Entry type
// Firestore stores dates as Timestamps, we convert them to JS Dates
const toEntry = (id: string, data: any): Entry => ({
    id,
    title: data.title ?? '',
    body: data.body ?? '',
    bodyText: data.bodyText ?? '',
    mood: data.mood ?? null,
    moodScore: data.moodScore ?? null,
    tags: data.tags ?? [],
    type: data.type ?? 'entry',
    wordCount: data.wordCount ?? 0,
    location: data.location ?? null,
    // Convert Firestore Timestamp → JS Date
    createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate() : new Date(),
    status: data.status ?? 'draft',
    isDeleted: data.isDeleted ?? false,
    deletedAt: data.deletedAt instanceof Timestamp
        ? data.deletedAt.toDate() : null,
    aiReflection: data.aiReflection ?? null,
    sentimentScore: data.sentimentScore ?? null,
})

// Reference to a user's entries subcollection
const entriesRef = (uid: string) =>
    collection(db, 'users', uid, 'entries')

// ── CREATE ───────────────────────────────────────────────────
// Creates a new blank entry and returns its ID
// Called when user clicks "New Entry"
export const createEntry = async (uid: string): Promise<string> => {
    const ref = await addDoc(entriesRef(uid), {
        title: '',
        body: '',
        bodyText: '',
        mood: null,
        moodScore: null,
        tags: [],
        type: 'entry',
        wordCount: 0,
        location: null,
        // serverTimestamp() sets the time on Firebase's server
        // This is more reliable than using the user's local clock
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'draft',
        isDeleted: false,
        deletedAt: null,
        aiReflection: null,
        sentimentScore: null,
    })
    // ref.id is the auto-generated Firestore document ID
    return ref.id
}

// ── UPDATE ───────────────────────────────────────────────────
// Updates specific fields on an existing entry
// We use Partial<Entry> so you can update just title, or just body, etc.
export const updateEntry = async (
    uid: string,
    entryId: string,
    data: Partial<Entry>
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    await updateDoc(ref, {
        ...data,
        // Always update 'updatedAt' when anything changes
        updatedAt: serverTimestamp(),
    })
}

// ── GET ONE ──────────────────────────────────────────────────
// Fetches a single entry by ID
export const getEntry = async (
    uid: string,
    entryId: string
): Promise<Entry | null> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return toEntry(snap.id, snap.data())
}

// ── GET ALL ──────────────────────────────────────────────────
// Fetches all non-deleted entries, newest first
// Used by Dashboard (recent entries) and Timeline
export const getEntries = async (uid: string): Promise<Entry[]> => {
    const q = query(
        entriesRef(uid),
        where('isDeleted', '==', false),   // exclude soft-deleted
        orderBy('createdAt', 'desc')        // newest first
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => toEntry(d.id, d.data()))
}

// ── SOFT DELETE ──────────────────────────────────────────────
// Marks entry as deleted instead of actually deleting it
// Gives users a 30-day recovery window
export const deleteEntry = async (
    uid: string,
    entryId: string
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    await updateDoc(ref, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
    })
}