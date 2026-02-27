import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminRoute({ children }) {
    const { loading, isAuthenticated, user } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                        <span className="text-2xl font-bold text-primary/70 tracking-tight">H</span>
                    </div>
                    <p className="text-foreground/50 text-sm tracking-wide">Authenticating Admin...</p>
                </div>
            </div>
        )
    }

    // Check if authenticated AND matches admin email
    const isAdmin = isAuthenticated && user?.email === 'youngdumbrokedie@gmail.com'

    if (!isAdmin) {
        // If not admin, redirect to home or dashboard
        return <Navigate to="/dashboard" replace />
    }

    return children
}
