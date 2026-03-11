import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getEntries } from '@/services/firebase/entries'
import type { Entry } from '@/types/entry'

export const useEntries = () => {
    const { user } = useAuthStore()
    const [entries, setEntries] = useState<Entry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        if (!user) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            setError(null)
            const data = await getEntries(user.uid)
            setEntries(data)
        } catch (e: any) {
            console.error('useEntries fetch error:', e)
            setError(e.message ?? 'Failed to load entries')
        } finally {
            setLoading(false)
        }
    }, [user])

    // Fetch on mount and whenever user changes (login/logout)
    useEffect(() => {
        fetch()
    }, [fetch])

    return { entries, loading, error, refetch: fetch }
}