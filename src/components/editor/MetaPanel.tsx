import { useState } from 'react'
import { MOODS } from '@/types/mood'
import type { MoodType } from '@/types/entry'

interface MetaPanelProps {
    moods: MoodType[]
    tags: string[]
    wordCount: number
    onMoodsChange: (moods: MoodType[]) => void
    onTagsChange: (tags: string[]) => void
}

export const MetaPanel = ({
    moods, tags, wordCount, onMoodsChange, onTagsChange,
}: MetaPanelProps) => {
    const [tagInput, setTagInput] = useState('')

    // Toggle a mood on/off — allows multiple selections
    const toggleMood = (value: MoodType) => {
        if (moods.includes(value)) {
            onMoodsChange(moods.filter(m => m !== value))
        } else {
            onMoodsChange([...moods, value])
        }
    }

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const val = tagInput.trim().replace(/,/g, '')
            if (val && !tags.includes(val) && tags.length < 8) {
                onTagsChange([...tags, val])
            }
            setTagInput('')
        }
        if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
            onTagsChange(tags.slice(0, -1))
        }
    }

    const removeTag = (tag: string) => onTagsChange(tags.filter(t => t !== tag))

    return (
        <div className="px-5 py-5 flex flex-col gap-6">

            {/* ── STATS ── */}
            <div>
                <div className="text-[10px] font-semibold text-muted uppercase
                        tracking-wider mb-2">
                    Stats
                </div>
                <div className="flex gap-2">
                    {/* Words */}
                    <div className="flex-1 flex items-center justify-between bg-bg
                          border border-border rounded-xl px-3 py-2.5">
                        <span className="text-xs text-muted">Words</span>
                        <span className="text-sm font-semibold text-ink font-lora">
                            {wordCount}
                        </span>
                    </div>
                    {/* Read time */}
                    <div className="flex-1 flex items-center justify-between bg-bg
                          border border-border rounded-xl px-3 py-2.5">
                        <span className="text-xs text-muted">Read</span>
                        <span className="text-sm font-semibold text-ink font-lora">
                            ~{Math.max(1, Math.ceil(wordCount / 200))}m
                        </span>
                    </div>
                </div>
            </div>

            {/* ── MOOD — multiple selection ── */}
            <div>
                <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Mood
                    </div>
                    {moods.length > 0 && (
                        <button
                            onClick={() => onMoodsChange([])}
                            className="text-[10px] text-muted hover:text-terra transition-colors"
                        >
                            Clear all ×
                        </button>
                    )}
                </div>

                {/* Selected moods summary */}
                {moods.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {moods.map(m => {
                            const def = MOODS.find(x => x.value === m)
                            return def ? (
                                <span key={m} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border ${def.color} border-current`}>
                                    {def.emoji} {def.label}
                                    <button onClick={() => toggleMood(m)} className="hover:opacity-60 ml-0.5">×</button>
                                </span>
                            ) : null
                        })}
                    </div>
                )}

                {/* Mood grid — 2 cols, tap to toggle */}
                <div className="grid grid-cols-2 gap-1.5">
                    {MOODS.map((m) => {
                        const selected = moods.includes(m.value)
                        return (
                            <button
                                key={m.value}
                                onClick={() => toggleMood(m.value)}
                                className={`flex items-center gap-2 px-3 py-2.5
                            rounded-xl border text-xs transition-all
                            text-left ${selected
                                        ? `${m.color} border-current font-medium`
                                        : 'border-border text-ink2 bg-bg hover:border-accent hover:bg-accent-pale hover:text-accent'
                                    }`}
                            >
                                <span className="text-base shrink-0">{m.emoji}</span>
                                <span>{m.label}</span>
                                {selected && (
                                    <span className="ml-auto text-[10px] opacity-60">✓</span>
                                )}
                            </button>
                        )
                    })}
                </div>
                <div className="text-[10px] text-muted mt-1.5">
                    Select all that apply
                </div>
            </div>

            {/* ── TAGS ── */}
            <div>
                <div className="text-[10px] font-semibold text-muted uppercase
                        tracking-wider mb-2">
                    Tags
                </div>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {tags.map(tag => (
                            <span
                                key={tag}
                                className="flex items-center gap-1 px-2 py-0.5
                           bg-accent-pale text-accent text-[11px]
                           rounded-lg font-medium"
                            >
                                #{tag}
                                <button
                                    onClick={() => removeTag(tag)}
                                    className="hover:text-terra transition-colors"
                                >×</button>
                            </span>
                        ))}
                    </div>
                )}
                <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag, press Enter…"
                    maxLength={20}
                    className="w-full px-3 py-2 bg-bg border border-border
                     rounded-xl text-xs text-ink outline-none
                     focus:border-accent transition-colors
                     placeholder:text-muted"
                />
                <div className="text-[10px] text-muted mt-1">{tags.length}/8 tags</div>
            </div>

            {/* ── TIP ── */}
            <div className="hidden lg:block bg-surface rounded-xl p-3.5">
                <div className="text-[10px] font-semibold text-muted uppercase
                        tracking-wider mb-1.5">
                    Keyboard shortcuts
                </div>
                <div className="flex flex-col gap-1.5">
                    {[
                        ['Ctrl+S', 'Save'],
                        ['Ctrl+B', 'Bold'],
                        ['Ctrl+I', 'Italic'],
                        ['Tab', 'Indent list'],
                    ].map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                            <span className="text-[11px] text-muted">{label}</span>
                            <kbd className="px-1.5 py-0.5 bg-card border border-border
                              rounded text-[10px] text-ink2 font-mono">
                                {key}
                            </kbd>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}