import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
    createEntry,
    updateEntry,
    deleteEntry,
} from '@/services/firebase/entries'
import type { Entry } from '@/types/entry'

// Handles creating, updating, and deleting a single entry
export const useEntry = () => {
    const { user } = useAuthStore()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Creates a new blank entry and returns the new ID
    const create = async (): Promise<string | null> => {
        if (!user) return null
        try {
            setSaving(true)
            const id = await createEntry(user.uid)
            return id
        } catch (e: any) {
            setError(e.message)
            return null
        } finally {
            setSaving(false)
        }
    }

    // Updates specific fields on an existing entry
    const update = async (
        entryId: string,
        data: Partial<Entry>
    ): Promise<void> => {
        if (!user) return
        try {
            setSaving(true)
            await updateEntry(user.uid, entryId, data)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    // Soft deletes an entry
    const remove = async (entryId: string): Promise<void> => {
        if (!user) return
        try {
            await deleteEntry(user.uid, entryId)
        } catch (e: any) {
            setError(e.message)
        }
    }

    return { create, update, remove, saving, error }
}