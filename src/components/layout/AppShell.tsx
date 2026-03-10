import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export const AppShell = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden">

            {/* ── MOBILE OVERLAY ── */}
            {/* Dark backdrop — only visible on mobile when sidebar is open */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── SIDEBAR ── */}
            {/* On desktop: always visible. On mobile: slides in from left when open */}
            <div
                className={`
          fixed inset-y-0 left-0 z-30 w-[260px] transition-transform duration-300
          lg:static lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 h-full overflow-y-auto bg-bg flex flex-col">

                {/* Mobile top bar with hamburger */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3
                        border-b border-border bg-card shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-surface transition-colors"
                        aria-label="Open menu"
                    >
                        {/* Hamburger icon */}
                        <div className="flex flex-col gap-[5px]">
                            <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                            <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                            <span className="block w-5 h-[1.5px] bg-ink rounded-full" />
                        </div>
                    </button>
                    <span className="font-lora text-base font-semibold text-ink">
                        Sere<span className="text-accent">Note</span>
                    </span>
                </div>

                {/* Page content */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>

            </main>
        </div>
    )
}