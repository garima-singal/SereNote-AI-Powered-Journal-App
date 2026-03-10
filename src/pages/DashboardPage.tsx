import { useAuthStore } from '@/store/authStore'
import { useEntries } from '@/hooks/useEntries'
import { MOODS } from '@/types/mood'
import { useNavigate } from 'react-router-dom'
import { format, subYears, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export const DashboardPage = () => {
    const { user } = useAuthStore()
    const { entries, loading } = useEntries()
    const navigate = useNavigate()

    // Get first name only — comes from Firebase Auth
    const firstName = user?.displayName?.split(' ')[0] ?? 'there'

    // Greeting based on time of day
    const hour = new Date().getHours()
    const greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening'

    // Today's date e.g. "Monday, March 10"
    const today = format(new Date(), 'EEEE, MMMM d')

    // Recent 3 entries
    const recentEntries = entries.slice(0, 3)

    // Today's prompt — rotates by day of week
    const prompts = [
        "What made today worth it?",
        "What are you grateful for right now?",
        "What's been on your mind lately?",
        "Describe a moment today that made you smile.",
        "What would you tell your past self?",
        "What are you looking forward to?",
        "What did you learn today?",
    ]
    const prompt = prompts[new Date().getDay()]

    // Stats
    const totalWords = entries.reduce((a, e) => a + e.wordCount, 0)
    const thisMonthCount = entries.filter(
        e => e.createdAt.getMonth() === new Date().getMonth()
    ).length

    // This day last year — find entries from ±1 day of today, 1 year ago
    const lastYearDate = subYears(new Date(), 1)
    const lastYearEntry = entries.find(e =>
        isWithinInterval(e.createdAt, {
            start: startOfDay(lastYearDate),
            end: endOfDay(lastYearDate),
        })
    )

    return (
        <div className="px-4 py-5 sm:px-6 sm:py-6 max-w-5xl mx-auto">

            {/* ── GREETING HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-start
                      sm:justify-between gap-3 mb-5">
                <div>
                    <div className="text-[11px] font-medium text-muted uppercase
                          tracking-wider mb-1">
                        {today}
                    </div>
                    <h1 className="font-lora text-xl sm:text-2xl font-semibold text-ink">
                        {greeting},{' '}
                        <span className="italic text-accent">{firstName}</span> ✦
                    </h1>
                </div>

                <button
                    onClick={() => navigate('/write')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent
                     text-white rounded-xl text-sm font-medium
                     hover:opacity-90 transition-opacity
                     self-start sm:self-auto shrink-0"
                >
                    <span className="text-base leading-none">+</span>
                    New Entry
                </button>
            </div>

            {/* ── MOOD CHECK-IN ── */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                <div className="text-[11px] font-medium text-muted uppercase
                        tracking-wider mb-3">
                    How are you feeling?
                </div>
                <div className="flex gap-2 flex-wrap">
                    {MOODS.map((mood) => (
                        <button
                            key={mood.value}
                            className="flex items-center gap-1.5 px-3 py-1.5
                         rounded-xl border border-border bg-bg
                         text-xs text-ink2 hover:border-accent
                         hover:bg-accent-pale hover:text-accent
                         transition-all cursor-pointer whitespace-nowrap"
                        >
                            <span>{mood.emoji}</span>
                            {mood.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MAIN GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                {/* Recent Entries — spans 2 cols */}
                <div className="lg:col-span-2 bg-card border border-border
                        rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex
                          items-center justify-between">
                        <div className="text-sm font-semibold text-ink">
                            Recent Entries
                        </div>
                        <button
                            onClick={() => navigate('/timeline')}
                            className="text-xs text-accent hover:underline"
                        >
                            View all →
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-6 text-sm text-muted text-center">
                            Loading entries...
                        </div>
                    ) : recentEntries.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="text-3xl mb-3">✦</div>
                            <div className="font-lora text-base text-ink mb-1">
                                Your journal awaits
                            </div>
                            <div className="text-xs text-muted mb-4">
                                Write your first entry to get started
                            </div>
                            <button
                                onClick={() => navigate('/write')}
                                className="px-4 py-2 bg-accent text-white rounded-xl
                           text-xs font-medium hover:opacity-90"
                            >
                                Write first entry
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {recentEntries.map((entry) => (
                                <div
                                    key={entry.id}
                                    onClick={() => navigate(`/write/${entry.id}`)}
                                    className="px-4 py-3 hover:bg-bg transition-colors cursor-pointer"
                                >
                                    <div className="font-lora text-sm font-semibold text-ink mb-1">
                                        {entry.title || 'Untitled Entry'}
                                    </div>
                                    <div className="text-xs text-ink2 line-clamp-1 mb-2">
                                        {entry.bodyText || 'No content yet...'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {entry.mood && (
                                            <span className="text-xs">
                                                {MOODS.find(m => m.value === entry.mood)?.emoji}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-muted">
                                            {format(entry.createdAt, 'MMM d')}
                                        </span>
                                        <span className="text-[10px] text-muted">
                                            · {entry.wordCount} words
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN: Streak + This Day Last Year ── */}
                <div className="flex flex-col gap-4">

                    {/* Streak Card — compact */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-border">
                            <div className="text-sm font-semibold text-ink">Writing Streak</div>
                        </div>
                        <div className="px-3 py-3 flex items-center gap-3">

                            {/* Streak number */}
                            <div className="text-center shrink-0">
                                <div className="font-lora text-2xl font-semibold text-ink leading-none">
                                    {entries.length > 0 ? '1' : '0'}
                                </div>
                                <div className="text-[9px] text-muted mt-0.5">days 🔥</div>
                            </div>

                            {/* Vertical divider */}
                            <div className="w-px h-8 bg-border shrink-0" />

                            {/* Heatmap — 4 rows × 7 cols = 28 days */}
                            <div className="flex flex-col gap-[2px]">
                                {Array.from({ length: 4 }).map((_, row) => (
                                    <div key={row} className="flex gap-[2px]">
                                        {Array.from({ length: 7 }).map((_, col) => {
                                            const i = row * 7 + col
                                            const hasEntry = i >= 24
                                            return (
                                                <div
                                                    key={col}
                                                    className={`w-[7px] h-[7px] rounded-[1.5px] ${hasEntry ? 'bg-accent' : 'bg-border'
                                                        }`}
                                                />
                                            )
                                        })}
                                    </div>
                                ))}
                                <div className="text-[8px] text-muted mt-0.5">Last 4 weeks</div>
                            </div>

                        </div>
                    </div>

                    {/* This Day Last Year card — fills the remaining space */}
                    <div className="flex-1 bg-lav-pale border border-lav/20
                          rounded-2xl p-4 flex flex-col">
                        <div className="text-[10px] font-semibold text-lav uppercase
                            tracking-wider mb-2">
                            This Day Last Year
                        </div>

                        {lastYearEntry ? (
                            /* Found an entry from last year */
                            <div
                                onClick={() => navigate(`/write/${lastYearEntry.id}`)}
                                className="flex-1 cursor-pointer"
                            >
                                <div className="font-lora text-sm font-semibold text-ink mb-1">
                                    {lastYearEntry.title || 'Untitled Entry'}
                                </div>
                                <div className="text-xs text-ink2 line-clamp-3 leading-relaxed mb-3">
                                    {lastYearEntry.bodyText || 'No content...'}
                                </div>
                                <div className="flex items-center gap-2">
                                    {lastYearEntry.mood && (
                                        <span className="text-xs">
                                            {MOODS.find(m => m.value === lastYearEntry.mood)?.emoji}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-muted">
                                        {format(lastYearEntry.createdAt, 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <div className="text-[10px] text-lav font-medium mt-2 hover:underline">
                                    Read this entry →
                                </div>
                            </div>
                        ) : (
                            /* No entry found from last year */
                            <div className="flex-1 flex flex-col items-center
                              justify-center text-center py-2">
                                <div className="text-2xl mb-2">🕰️</div>
                                <div className="text-xs text-ink2 font-medium mb-1">
                                    No entry yet
                                </div>
                                <div className="text-[10px] text-muted leading-relaxed">
                                    {format(lastYearDate, 'MMM d, yyyy')} was a blank page.
                                    Keep writing — future you will love looking back.
                                </div>
                            </div>
                        )}
                    </div>

                </div>
                {/* ── END RIGHT COLUMN ── */}

            </div>
            {/* ── END MAIN GRID ── */}

            {/* ── BOTTOM GRID ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Today's Prompt */}
                <div className="bg-terra-pale border border-terra/20 rounded-2xl p-5">
                    <div className="text-[10px] font-semibold text-terra
                          uppercase tracking-wider mb-2.5">
                        Today's Prompt
                    </div>
                    <div className="font-lora italic text-sm text-ink leading-relaxed mb-4">
                        "{prompt}"
                    </div>
                    <button
                        onClick={() => navigate('/write')}
                        className="text-xs text-terra font-medium hover:underline"
                    >
                        Write about this →
                    </button>
                </div>

                {/* Quick Stats */}
                <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="text-xs font-semibold text-ink mb-4">Your Journal</div>
                    <div className="flex flex-col gap-3">
                        <StatRow label="Total entries" value={entries.length.toString()} />
                        <StatRow label="Total words" value={totalWords.toLocaleString()} />
                        <StatRow label="This month" value={thisMonthCount.toString()} />
                    </div>
                </div>

                {/* Quick Write */}
                <div className="bg-card border border-border rounded-2xl p-5
                        sm:col-span-2 lg:col-span-1">
                    <div className="text-xs font-semibold text-ink mb-3">Quick Note</div>
                    <div
                        onClick={() => navigate('/write')}
                        className="w-full min-h-[80px] bg-bg border border-border
                       rounded-xl px-3 py-2.5 text-xs text-muted
                       cursor-pointer hover:border-accent transition-colors"
                    >
                        What's on your mind?
                    </div>
                    <button
                        onClick={() => navigate('/write')}
                        className="w-full mt-2.5 py-2.5 bg-ink text-bg rounded-xl
                       text-xs font-medium hover:opacity-85 transition-opacity"
                    >
                        Open Editor →
                    </button>
                </div>

            </div>
            {/* ── END BOTTOM GRID ── */}

        </div>
    )
}

// ── STAT ROW ─────────────────────────────────────────────────
const StatRow = ({
    label,
    value,
}: {
    label: string
    value: string
}) => (
    <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-semibold text-ink">{value}</span>
    </div>
)