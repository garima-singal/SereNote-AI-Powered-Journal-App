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