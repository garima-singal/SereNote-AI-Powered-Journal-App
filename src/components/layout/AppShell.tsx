// Outlet renders whichever child route is currently active
// e.g. if path is '/', it renders DashboardPage inside here
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'


export const AppShell = () => {
    return (
        // Full screen height, flex row = sidebar on left, content on right
        <div className="flex h-screen overflow-hidden">

            {/* SIDEBAR — fixed left panel */}
            <Sidebar />

            {/* MAIN CONTENT — takes remaining space, scrollable */}
            <main className="flex-1 h-full overflow-y-auto bg-bg">
                {/* Outlet renders the current page here */}
                <Outlet />
            </main>

        </div >
    )
}

const NavItem = ({
    icon,
    label,
    active = false,
}: {
    icon: string
    label: string
    active?: boolean
}) => {
    return (
        <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg
      text-sm cursor-pointer transition-colors
      ${active
                ? 'bg-accent-pale text-accent font-medium'  // active state
                : 'text-ink2 hover:bg-border'               // default state
            }
    `}>
            <span className="w-4 text-center text-xs">{icon}</span>
            {label}
        </div>
    )
}