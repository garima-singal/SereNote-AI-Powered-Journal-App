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

const toEntry = (id: string, data: any): Entry => ({
    id,
    title: data.title ?? '',
    body: data.body ?? '',
    bodyText: data.bodyText ?? '',
    // Support both old single mood and new multiple moods
    moods: data.moods ?? (data.mood ? [data.mood] : []),
    moodScore: data.moodScore ?? null,
    tags: data.tags ?? [],
    type: data.type ?? 'entry',
    wordCount: data.wordCount ?? 0,
    location: data.location ?? null,
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

const entriesRef = (uid: string) =>
    collection(db, 'users', uid, 'entries')

export const createEntry = async (uid: string): Promise<string> => {
    const ref = await addDoc(entriesRef(uid), {
        title: '',
        body: '',
        bodyText: '',
        moods: [],
        moodScore: null,
        tags: [],
        type: 'entry',
        wordCount: 0,
        location: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'draft',
        isDeleted: false,
        deletedAt: null,
        aiReflection: null,
        sentimentScore: null,
    })
    return ref.id
}

export const updateEntry = async (
    uid: string,
    entryId: string,
    data: Partial<Entry>
): Promise<void> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp(),
    })
}

export const getEntry = async (
    uid: string,
    entryId: string
): Promise<Entry | null> => {
    const ref = doc(db, 'users', uid, 'entries', entryId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return toEntry(snap.id, snap.data())
}

export const getEntries = async (uid: string): Promise<Entry[]> => {
    const q = query(
        entriesRef(uid),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => toEntry(d.id, d.data()))
}

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