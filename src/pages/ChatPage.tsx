import { useState, useRef, useEffect } from 'react'
// import { useAuthStore } from '@/store/authStore'
import { auth } from '@/services/firebase/config'
import { toast } from 'sonner'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const SUGGESTED_QUESTIONS = [
    "What have I been most stressed about lately?",
    "What made me happy this month?",
    "What patterns do you notice in my writing?",
    "How has my mood changed over time?",
    "What am I avoiding writing about?",
    "What do I seem to care about most?",
]

const TypingDots = () => (
    <div className="flex items-center gap-1 py-1">
        {[0, 1, 2].map(i => (
            <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
            />
        ))}
    </div>
)

export const ChatPage = () => {
    // const { user } = useAuthStore()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [remaining, setRemaining] = useState<number | null>(null)
    const [historyLoading, setHistoryLoading] = useState(true)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Load chat history from Firestore on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const token = await auth.currentUser?.getIdToken()
                if (!token) return
                const res = await fetch('/api/ai/chat_history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (res.ok && data.messages?.length > 0) {
                    setMessages(data.messages.map((m: any) => ({
                        role: m.role,
                        content: m.content,
                    })))
                }
            } catch {
                // silently fail — start fresh
            } finally {
                setHistoryLoading(false)
            }
        }
        loadHistory()
    }, [])

    // Auto scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    // Auto resize textarea
    const resizeInput = () => {
        const el = inputRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }

    const sendMessage = async (text?: string) => {
        const content = (text ?? input).trim()
        if (!content || loading) return

        const userMessage: Message = { role: 'user', content }
        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')
        if (inputRef.current) inputRef.current.style.height = 'auto'
        setLoading(true)

        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error('Not authenticated')

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ messages: newMessages }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Chat failed')

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
            }])
            if (data.remaining !== undefined) setRemaining(data.remaining)

        } catch (e: any) {
            toast.error(e.message ?? 'Something went wrong')
            // Remove the user message if request failed
            setMessages(messages)
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = async () => {
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return
            await fetch('/api/ai/chat_history', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            })
        } catch {
            // silently fail
        }
        setMessages([])
        setRemaining(null)
        inputRef.current?.focus()
    }

    return (
        <div className="flex flex-col h-screen bg-bg">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-6 py-4
                      border-b border-border bg-card shrink-0">
                <div>
                    <h1 className="font-lora text-lg font-semibold text-ink">
                        Chat with your Journal
                    </h1>
                    <p className="text-xs text-muted mt-0.5">
                        Ask anything about your entries
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {remaining !== null && (
                        <span className="text-[10px] text-muted">
                            {remaining} messages left today
                        </span>
                    )}
                    {messages.length > 0 && (
                        <button
                            onClick={clearChat}
                            className="text-xs text-muted hover:text-terra transition-colors"
                        >
                            Clear chat
                        </button>
                    )}
                </div>
            </div>

            {/* ── MESSAGES ── */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

                {/* Loading history */}
                {historyLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 border-2 border-lav border-t-transparent
                            rounded-full animate-spin" />
                    </div>
                )}

                {/* Empty state — suggested questions */}
                {!historyLoading && messages.length === 0 && (
                    <div className="max-w-xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-lav-pale border border-lav/20
                              flex items-center justify-center mx-auto mb-3 text-xl">
                                ✦
                            </div>
                            <h2 className="font-lora text-base font-semibold text-ink mb-1">
                                Your journal, as a conversation
                            </h2>
                            <p className="text-xs text-muted leading-relaxed">
                                I've read all your entries. Ask me anything about your thoughts,
                                patterns, or feelings.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SUGGESTED_QUESTIONS.map(q => (
                                <button
                                    key={q}
                                    onClick={() => sendMessage(q)}
                                    className="text-left px-3.5 py-2.5 rounded-xl border border-border
                             bg-card text-xs text-ink2 hover:border-lav/40
                             hover:bg-lav-pale transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] sm:max-w-[65%] ${msg.role === 'user'
                            ? 'bg-ink text-bg rounded-2xl rounded-tr-sm px-4 py-2.5'
                            : 'bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5'
                            }`}>
                            {msg.role === 'assistant' && (
                                <div className="text-[10px] text-lav font-semibold mb-1">✦ Journal AI</div>
                            )}
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-bg' : 'text-ink font-lora'
                                }`}>
                                {msg.content}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-tl-sm
                            px-4 py-2.5">
                            <div className="text-[10px] text-lav font-semibold mb-1">✦ Journal AI</div>
                            <TypingDots />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* ── INPUT ── */}
            <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border bg-card">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-end gap-2 bg-bg border border-border
                          rounded-2xl px-4 py-2.5 focus-within:border-lav/50
                          transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => { setInput(e.target.value); resizeInput() }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your journal…"
                            rows={1}
                            className="flex-1 bg-transparent text-sm text-ink resize-none
                         outline-none placeholder:text-muted leading-relaxed
                         max-h-[120px]"
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || loading}
                            className="shrink-0 w-8 h-8 rounded-xl bg-ink text-bg
                         flex items-center justify-center text-sm
                         hover:opacity-80 transition-opacity
                         disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ↑
                        </button>
                    </div>
                    <p className="text-[10px] text-muted text-center mt-2">
                        Press Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>

        </div>
    )
}