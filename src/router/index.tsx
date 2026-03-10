import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'

// ── PROTECTED ROUTE ──────────────────────────────────────────
// This is a wrapper component that guards private pages
// If the user is NOT logged in, it redirects them to /auth
// If they ARE logged in, it renders whatever is inside it
export const ProtectedRoute = ({
    children
}: {
    children: React.ReactNode
}) => {
    // Read the user and loading state from our Zustand store
    const { user, loading } = useAuthStore()

    // While Firebase is still checking auth state, show nothing
    // This prevents a flash of the login page for logged-in users
    if (loading) return null

    // If no user is logged in, redirect to the auth page
    // 'replace' means the /auth page replaces the current history entry
    // so the user can't press Back to get to the protected page
    if (!user) return <Navigate to="/auth" replace />

    // User is logged in — render the protected content
    return <>{children}</>
}

// ── ROUTER ───────────────────────────────────────────────────
// createBrowserRouter sets up all our app's routes
// Each object is one route: { path, element }
export const router = createBrowserRouter([
    {
        // /auth is the login page — publicly accessible
        path: '/auth',
        element: <AuthPage />,
    },
    {
        // '/' is the root — everything inside needs login
        path: '/',
        // AppShell is our sidebar + layout wrapper
        // ProtectedRoute guards it — redirects to /auth if not logged in
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        // These are nested routes — they render INSIDE AppShell
        children: [
            {
                // The index route renders when path is exactly '/'
                index: true,
                element: <DashboardPage />,
            },
            {
                // Write new entry
                path: 'write',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Write page — coming soon
                    </div>
                ),
            },
            {
                // Edit existing entry by ID
                path: 'write/:entryId',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Edit entry — coming soon
                    </div>
                ),
            },
            {
                // Bookmarks page
                path: 'bookmarks',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Bookmarks — coming soon
                    </div>
                ),
            },
            {
                // Timeline / all entries
                path: 'timeline',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Timeline — coming soon
                    </div>
                ),
            },
            {
                // Settings
                path: 'settings',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Settings — coming soon
                    </div>
                ),
            },
            {
                // Profile
                path: 'profile',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Profile — coming soon
                    </div>
                ),
            },
            {
                // Insights
                path: 'insights',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Insights — coming soon
                    </div>
                ),
            },
            {
                // Search
                path: 'search',
                element: (
                    <div className="p-8 text-ink font-lora text-xl">
                        Search — coming soon
                    </div>
                ),
            },
        ],
    },
])