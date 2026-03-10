import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { logOut } from '@/services/firebase/auth'

// Nav items — path, label, icon (emoji for now)
const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: '◇' },
    { path: '/bookmarks', label: 'Bookmarks', icon: '◈' },
    { path: '/settings', label: 'Settings', icon: '◎' },
    { path: '/profile', label: 'Profile', icon: '◉' },
]

interface SidebarProps {
    // Called when user taps a nav item or closes on mobile
    onClose?: () => void
}

export const Sidebar = ({ onClose }: SidebarProps) => {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logOut()
        navigate('/auth')
    }

    return (
        <aside className="w-[260px] h-full bg-card border-r border-border
                      flex flex-col overflow-hidden">

            {/* ── LOGO ── */}
            <div className="px-5 py-5 border-b border-border">
                <div className="font-lora text-xl font-semibold text-ink">
                    Sere<span className="text-accent">Note</span>
                </div>
                <div className="text-[10px] text-muted mt-0.5 uppercase tracking-widest">
                    Your private space
                </div>
            </div>

            {/* ── NEW ENTRY BUTTON ── */}
            <div className="px-4 pt-4 pb-2">
                <button
                    onClick={() => { navigate('/write'); onClose?.() }}
                    className="w-full flex items-center justify-center gap-2
                     py-2 bg-accent text-white rounded-xl text-sm
                     font-medium hover:opacity-90 transition-opacity"
                >
                    <span className="text-base leading-none">+</span>
                    New Entry
                </button>
            </div>

            {/* ── NAV ITEMS ── */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={() => onClose?.()}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl
               text-sm transition-colors mb-0.5
               ${isActive
                                ? 'bg-accent-pale text-accent font-medium'
                                : 'text-ink2 hover:bg-surface hover:text-ink'
                            }`
                        }
                    >
                        <span className="text-base leading-none">{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* ── USER FOOTER ── */}
            <div className="px-4 py-4 border-t border-border">
                {/* User info row */}
                <div className="flex items-center gap-3 mb-3">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt="avatar"
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-accent-pale
                            flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-accent">
                                {(user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ink truncate">
                            {user?.displayName ?? user?.email ?? 'User'}
                        </div>
                        <div className="text-[10px] text-muted truncate">Free plan</div>
                    </div>
                </div>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2
                     rounded-xl text-xs text-muted
                     hover:bg-terra-pale hover:text-terra
                     transition-colors"
                >
                    <span className="text-sm">→</span>
                    Sign out
                </button>
            </div>

        </aside>
    )
}