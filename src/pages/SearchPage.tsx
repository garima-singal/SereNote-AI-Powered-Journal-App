import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntries } from '@/hooks/useEntries'
import { MOODS } from '@/types/mood'
import { format } from 'date-fns'
import type { Entry } from '@/types/entry'

export const SearchPage = () => {
    const { entries, loading } = useEntries()
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)

    const [query, setQuery] = useState('')
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('sn_recent_searches') ?? '[]') }
        catch { return [] }
    })

    // Focus input on mount
    useEffect(() => { inputRef.current?.focus() }, [])

    // Save to recent searches
    const commitSearch = (q: string) => {
        const trimmed = q.trim()
        if (!trimmed || trimmed.length < 2) return
        setRecentSearches(prev => {
            const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 6)
            localStorage.setItem('sn_recent_searches', JSON.stringify(updated))
            return updated
        })
    }

    const removeRecent = (s: string) => {
        setRecentSearches(prev => {
            const updated = prev.filter(x => x !== s)
            localStorage.setItem('sn_recent_searches', JSON.stringify(updated))
            return updated
        })
    }

    // Search across title, body, tags, moods
    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        return entries.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.bodyText.toLowerCase().includes(q) ||
            e.tags.some(t => t.toLowerCase().includes(q)) ||
            e.moods.some(m => m.toLowerCase().includes(q))
        )
    }, [entries, query])

    // Highlight matching text
    const highlight = (text: string, q: string) => {
        if (!q.trim() || !text) return text
        const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return text.replace(
            new RegExp(`(${escaped})`, 'gi'),
            '<mark style="background:#E8F0E9;color:#5A7E5E;border-radius:3px;padding:0 2px;font-weight:500">$1</mark>'
        )
    }

    // Extract a relevant snippet around the match
    const getSnippet = (text: string, q: string): string => {
        if (!text || !q.trim()) return ''
        const idx = text.toLowerCase().indexOf(q.toLowerCase())
        if (idx === -1) return text.slice(0, 120)
        const start = Math.max(0, idx - 40)
        const end = Math.min(text.length, idx + 100)
        return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
    }

    const hasQuery = query.trim().length > 0
    const showEmpty = hasQuery && !loading && results.length === 0

    return (
        <div className="min-h-full bg-bg">
            <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">

                {/* ── HEADER ── */}
                <div className="mb-6">
                    <h1 className="font-lora text-xl sm:text-2xl font-semibold text-ink mb-0.5">
                        Search
                    </h1>
                    <p className="text-xs text-muted">
                        Search across {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                    </p>
                </div>

                {/* ── SEARCH INPUT ── */}
                <div className="relative mb-6">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2
                                     text-muted text-base pointer-events-none">⌕</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitSearch(query) }}
                        placeholder="Search titles, content, tags…"
                        className="w-full pl-10 pr-10 py-3 bg-card border border-border
                                   rounded-2xl text-sm text-ink outline-none
                                   focus:border-accent focus:shadow-[0_0_0_3px_#7A9E7E15]
                                   transition-all placeholder:text-muted"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2
                                       text-muted hover:text-ink transition-colors
                                       w-5 h-5 flex items-center justify-center
                                       rounded-full hover:bg-surface"
                        >×</button>
                    )}
                </div>

                {/* ── RECENT SEARCHES — shown when no query ── */}
                {!hasQuery && recentSearches.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold text-muted
                                             uppercase tracking-wider">Recent</span>
                            <button
                                onClick={() => {
                                    setRecentSearches([])
                                    localStorage.removeItem('sn_recent_searches')
                                }}
                                className="text-[10px] text-muted hover:text-terra transition-colors"
                            >Clear all</button>
                        </div>
                        <div className="flex flex-col gap-1">
                            {recentSearches.map(s => (
                                <div key={s}
                                    className="flex items-center justify-between group
                                                px-3 py-2 rounded-xl hover:bg-surface
                                                transition-colors cursor-pointer"
                                    onClick={() => setQuery(s)}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-muted text-xs shrink-0">↩</span>
                                        <span className="text-sm text-ink truncate">{s}</span>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); removeRecent(s) }}
                                        className="text-muted hover:text-terra opacity-0
                                                   group-hover:opacity-100 transition-all
                                                   text-xs shrink-0 ml-2"
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── SUGGESTIONS — shown when no query and no recent ── */}
                {!hasQuery && recentSearches.length === 0 && !loading && entries.length > 0 && (
                    <div className="mb-6">
                        <div className="text-[10px] font-semibold text-muted
                                        uppercase tracking-wider mb-3">Suggestions</div>
                        <div className="flex flex-wrap gap-2">
                            {/* All unique tags as quick search pills */}
                            {Array.from(new Set(entries.flatMap(e => e.tags))).slice(0, 8).map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setQuery(tag)}
                                    className="px-3 py-1.5 bg-surface border border-border
                                               rounded-xl text-xs text-ink2 hover:border-accent
                                               hover:text-accent hover:bg-accent-pale
                                               transition-all font-medium"
                                >#{tag}</button>
                            ))}
                            {/* Mood names as quick pills */}
                            {MOODS.slice(0, 4).map(m => (
                                <button
                                    key={m.value}
                                    onClick={() => setQuery(m.value)}
                                    className="flex items-center gap-1.5 px-3 py-1.5
                                               bg-surface border border-border rounded-xl
                                               text-xs text-ink2 hover:border-accent
                                               hover:text-accent hover:bg-accent-pale
                                               transition-all font-medium"
                                >
                                    {m.emoji} {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── LOADING ── */}
                {loading && (
                    <div className="flex items-center justify-center py-16 gap-2">
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent
                                        rounded-full animate-spin" />
                        <span className="text-xs text-muted">Loading…</span>
                    </div>
                )}

                {/* ── RESULTS COUNT ── */}
                {hasQuery && !loading && results.length > 0 && (
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted">
                            {results.length} {results.length === 1 ? 'result' : 'results'}
                            {' '}for <span className="text-ink font-medium">"{query.trim()}"</span>
                        </span>
                        <button
                            onClick={() => commitSearch(query)}
                            className="text-[10px] text-accent hover:underline"
                        >Save search</button>
                    </div>
                )}

                {/* ── NO RESULTS ── */}
                {showEmpty && (
                    <div className="text-center py-16 px-4">
                        <div className="text-3xl mb-3">◎</div>
                        <div className="font-lora text-base text-ink mb-1">No results found</div>
                        <div className="text-sm text-muted">
                            Nothing matched <span className="text-ink">"{query.trim()}"</span>
                        </div>
                        <button
                            onClick={() => setQuery('')}
                            className="mt-4 text-sm text-accent hover:underline"
                        >Clear search</button>
                    </div>
                )}

                {/* ── RESULTS LIST ── */}
                {hasQuery && !loading && results.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {results.map(entry => (
                            <SearchResultCard
                                key={entry.id}
                                entry={entry}
                                query={query.trim()}
                                highlight={highlight}
                                getSnippet={getSnippet}
                                onClick={() => {
                                    commitSearch(query)
                                    navigate(`/write/${entry.id}`)
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* ── EMPTY APP STATE ── */}
                {!hasQuery && !loading && entries.length === 0 && (
                    <div className="text-center py-16 px-4">
                        <div className="text-4xl mb-4">✦</div>
                        <div className="font-lora text-lg text-ink mb-2">Nothing to search yet</div>
                        <div className="text-sm text-muted mb-6">
                            Write your first entry to get started
                        </div>
                        <button
                            onClick={() => navigate('/write')}
                            className="px-6 py-2.5 bg-accent text-white rounded-xl
                                       text-sm font-medium hover:opacity-90"
                        >Write first entry</button>
                    </div>
                )}

            </div>
        </div>
    )
}

// ── SEARCH RESULT CARD ────────────────────────────────────────
const SearchResultCard = ({
    entry,
    query,
    highlight,
    getSnippet,
    onClick,
}: {
    entry: Entry
    query: string
    highlight: (text: string, q: string) => string
    getSnippet: (text: string, q: string) => string
    onClick: () => void
}) => {
    const snippet = getSnippet(entry.bodyText, query)

    // Which fields matched
    const matchedTags = entry.tags.filter(t => t.toLowerCase().includes(query.toLowerCase()))
    const matchedMoods = entry.moods.filter(m => m.toLowerCase().includes(query.toLowerCase()))

    return (
        <div
            onClick={onClick}
            className="bg-card border border-border rounded-2xl px-4 py-3.5
                       hover:border-accent hover:shadow-sm transition-all
                       cursor-pointer group"
        >
            {/* Date */}
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                {format(entry.createdAt, 'EEE, MMM d yyyy · h:mm a')}
            </div>

            {/* Title */}
            <div
                className="font-lora text-sm font-semibold text-ink mb-1.5
                           group-hover:text-accent transition-colors leading-snug"
                dangerouslySetInnerHTML={{
                    __html: highlight(entry.title || 'Untitled Entry', query)
                }}
            />

            {/* Snippet */}
            {snippet && (
                <div
                    className="text-xs text-ink2 leading-relaxed mb-2.5
                               line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: highlight(snippet, query) }}
                />
            )}

            {/* Bottom row — moods, tags, word count */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {entry.moods.slice(0, 2).map(m => {
                        const def = MOODS.find(x => x.value === m)
                        return def ? (
                            <span
                                key={m}
                                className={`flex items-center gap-1 px-2 py-0.5
                                            rounded-lg text-[10px] font-medium
                                            ${matchedMoods.includes(m)
                                        ? 'bg-accent-pale text-accent'
                                        : def.color
                                    }`}
                            >
                                {def.emoji}
                                <span className="hidden sm:inline">{def.label}</span>
                            </span>
                        ) : null
                    })}
                    {entry.tags.slice(0, 3).map(tag => (
                        <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium
                                        hidden sm:inline-block ${matchedTags.includes(tag)
                                    ? 'bg-accent-pale text-accent'
                                    : 'bg-surface text-muted'
                                }`}
                        >#{tag}</span>
                    ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted">{entry.wordCount}w</span>
                    <span className="text-muted group-hover:text-accent transition-colors text-sm">→</span>
                </div>
            </div>
        </div>
    )
}