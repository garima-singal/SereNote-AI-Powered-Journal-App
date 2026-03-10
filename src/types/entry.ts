// This defines the shape of a journal entry
// Every entry in Firestore will match this structure
export interface Entry {
    id: string        // Firestore document ID
    title: string        // Entry title
    body: string        // TipTap HTML content
    bodyText: string        // Plain text (for search + AI)
    moods: MoodType[]
    moodScore: number | null
    tags: string[]
    type: 'entry' | 'quick-note'
    wordCount: number
    location: string | null // "Delhi, India"
    createdAt: Date
    updatedAt: Date
    status: 'draft' | 'published'
    isDeleted: boolean
    deletedAt: Date | null
    aiReflection: string | null // Phase 2
    sentimentScore: number | null // Phase 2
}

// All 8 mood options
export type MoodType =
    | 'calm'
    | 'grateful'
    | 'energized'
    | 'low'
    | 'anxious'
    | 'inspired'
    | 'frustrated'
    | 'reflective'