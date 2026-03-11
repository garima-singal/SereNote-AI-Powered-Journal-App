import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from 'sonner'

export const AppShell = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    // Close mobile drawer on route change
    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [sidebarOpen])

    return (
        <div className="flex h-screen overflow-hidden bg-bg">

            {/* ── TOAST NOTIFICATIONS ─────────────────────────────── */}
            <Toaster
                position="top-right"
                richColors
                toastOptions={{
                    style: {
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                    }
                }}
            />

            {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
            <div className="hidden lg:flex shrink-0">
                <Sidebar />
            </div>

            {/* ── MOBILE DRAWER ───────────────────────────────────── */}
            {/* Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-ink/30 lg:hidden
                     animate-in fade-in duration-150"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Drawer panel — slides in from left */}
            <div
                className={`fixed inset-y-0 left-0 z-50 lg:hidden
                    transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* ── MAIN CONTENT ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Mobile top bar */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3
                        border-b border-border bg-card shrink-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex flex-col gap-[5px] p-1.5 rounded-lg
                       hover:bg-surface transition-colors"
                        aria-label="Open menu"
                    >
                        <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                        <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                        <span className="block w-4 h-[1.5px] bg-ink rounded-full" />
                    </button>
                    <span className="font-lora text-base font-semibold text-ink">
                        SereNote
                    </span>
                </div>

                {/* Page content — scrollable */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>

            </div>
        </div>
    )
}