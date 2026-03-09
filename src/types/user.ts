export interface UserSettings {
    theme: 'light' | 'dark' | 'sepia'
    fontSize: 'sm' | 'md' | 'lg'
    fontFamily: 'lora' | 'crimson' | 'dm-sans'
    notificationsEnabled: boolean
    reminderTime: string   // "21:00"
    aiOptIn: boolean
}

export interface UserProfile {
    uid: string
    displayName: string
    email: string
    photoURL: string
    createdAt: Date
    streak: number
    bestStreak: number
    totalEntries: number
    settings: UserSettings
}