// Import MoodType from entry.ts where it's defined
import type { MoodType } from '@/types/entry'

// Full definition for each mood — used across the whole app
export interface MoodDefinition {
    value: MoodType
    label: string
    emoji: string
    score: number   // 1 (low) to 5 (high) — used for mood chart
    color: string   // Tailwind bg class for the chip
}

// Single source of truth for all mood data
// Import this wherever you need mood info
export const MOODS: MoodDefinition[] = [
    { value: 'grateful', label: 'Grateful', emoji: '😊', score: 5, color: 'bg-accent-pale text-accent' },
    { value: 'inspired', label: 'Inspired', emoji: '✨', score: 5, color: 'bg-lav-pale text-lav' },
    { value: 'energized', label: 'Energized', emoji: '🔥', score: 4, color: 'bg-gold/10 text-gold' },
    { value: 'calm', label: 'Calm', emoji: '😌', score: 4, color: 'bg-accent-pale text-accent' },
    { value: 'reflective', label: 'Reflective', emoji: '🤔', score: 3, color: 'bg-surface text-ink2' },
    { value: 'anxious', label: 'Anxious', emoji: '🌀', score: 2, color: 'bg-gold/10 text-gold' },
    { value: 'low', label: 'Low', emoji: '😔', score: 2, color: 'bg-surface text-muted' },
    { value: 'frustrated', label: 'Frustrated', emoji: '😤', score: 1, color: 'bg-terra-pale text-terra' },
]