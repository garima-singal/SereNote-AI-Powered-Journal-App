// NavLink gives us active state detection based on current URL
// useNavigate lets us redirect after logout
import { NavLink, useNavigate } from 'react-router-dom'

// Our logout function from Firebase
import { logOut } from '@/services/firebase/auth'

// We read the current user from Zustand to show their name + avatar
import { useAuthStore } from '@/store/authStore'

// useState to handle logout loading state
import { useState } from 'react'

// ── NAVIGATION ITEMS ──────────────────────────────────────────
// Defined as an array so it's easy to add/remove items later
// Each item has: path (URL), label (display text), icon (emoji)
const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: '⬡' },
    { path: '/bookmarks', label: 'Bookmarks', icon: '◇' },
    { path: '/settings', label: 'Settings', icon: '⊘' },
    { path: '/profile', label: 'Profile', icon: '👤' },
]

export const Sidebar = () => {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [loggingOut, setLoggingOut] = useState(false)

    // ── LOGOUT HANDLER ─────────────────────────────────────────
    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            await logOut()
            // After logout, send user to auth page
            navigate('/auth')
        } catch (e) {
            console.error('Logout failed:', e)
        } finally {
            setLoggingOut(false)
        }
    }

    // ── AVATAR HELPER ──────────────────────────────────────────
    // If user has a Google photo, show it
    // Otherwise show the first letter of their name
    const avatarLetter = user?.displayName?.[0]?.toUpperCase() ?? 'U'

    return (
        // Full height, fixed width sidebar
        <aside className="w-[260px] flex-shrink-0 h-full flex flex-col bg-surface border-r border-border">

            {/* ── LOGO ── */}
            <div className="px-5 py-5 border-b border-border">
                <div className="font-lora text-xl font-semibold text-ink">
                    Sere<span className="text-accent">Note</span>
                </div>
                <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
                    Your private space
                </div>
            </div>

            {/* ── NAV LINKS ── */}
            <nav className="flex-1 p-3 flex flex-col gap-0.5">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}

                        // 'end' on the Dashboard link means it only matches
                        // exactly '/' and not '/bookmarks' etc.
                        end={item.path === '/'}

                        // NavLink passes an 'isActive' boolean we can use
                        // to style the active item differently
                        className={({ isActive }) => `
              flex items-center gap-2.5 px-3 py-2.5 rounded-xl
              text-sm transition-colors cursor-pointer
              ${isActive
                                ? 'bg-accent-pale text-accent font-medium'
                                : 'text-ink2 hover:bg-border'
                            }
            `}
                    >
                        {/* Icon */}
                        <span className="w-4 text-center text-xs shrink-0">
                            {item.icon}
                        </span>

                        {/* Label */}
                        {item.label}
                    </NavLink>
                ))}

                {/* ── NEW ENTRY BUTTON ── */}
                {/* Sits below nav items, acts as a shortcut to /write */}
                <div className="mt-3 pt-3 border-t border-border">
                    <NavLink
                        to="/write"
                        className="flex items-center justify-center gap-2
                       w-full py-2.5 rounded-xl bg-accent text-white
                       text-sm font-medium hover:opacity-90
                       transition-opacity"
                    >
                        <span className="text-base leading-none">+</span>
                        New Entry
                    </NavLink>
                </div>
            </nav>

            {/* ── BOTTOM SECTION ── */}
            <div className="p-3 border-t border-border flex flex-col gap-1">

                {/* User info pill */}
                <NavLink
                    to="/profile"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl
                     hover:bg-border transition-colors cursor-pointer"
                >
                    {/* Avatar — photo or initial */}
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="avatar"
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center
                            justify-center text-white text-xs font-semibold
                            shrink-0">
                            {avatarLetter}
                        </div>
                    )}

                    {/* Name + plan */}
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ink truncate">
                            {user?.displayName ?? user?.email ?? 'User'}
                        </div>
                        <div className="text-[10px] text-muted">Free plan</div>
                    </div>
                </NavLink>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5
                     rounded-xl text-sm text-muted hover:bg-terra-pale
                     hover:text-terra transition-colors cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {/* Logout icon */}
                    <span className="w-4 text-center text-xs shrink-0">↩</span>
                    {loggingOut ? 'Signing out...' : 'Sign out'}
                </button>

            </div>
        </aside>
    )
}