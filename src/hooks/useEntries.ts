import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getEntries } from '@/services/firebase/entries'
import type { Entry } from '@/types/entry'

// Fetches all entries for the logged-in user
// Returns entries array + loading + error states
export const useEntries = () => {
    const { user } = useAuthStore()
    const [entries, setEntries] = useState<Entry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Don't fetch if no user is logged in
        if (!user) return

        const fetch = async () => {
            try {
                setLoading(true)
                const data = await getEntries(user.uid)
                setEntries(data)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }

        fetch()
        // Re-fetch whenever the user changes (e.g. after login)
    }, [user])

    return { entries, loading, error }
}