import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProtectedRoute({ children, requireEmailVerification = false }) {
  const { loading, isAuthenticated, isEmailVerified, user } = useAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary/70 tracking-tight">H</span>
          </div>
          <p className="text-foreground/50 text-sm tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />
  }

  // If email verification is required and not verified, redirect to verification page
  if (requireEmailVerification && !isEmailVerified) {
    return <Navigate to="/auth/verify-email" replace />
  }

  return (
    <>
      {/* Show warning banner if email is not verified (but don't block access) */}
      {!isEmailVerified && !dismissed && (
        <Alert className="m-4 border-primary/50 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Please verify your email address ({user?.email}) to access all features.
            </span>
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth/verify-email')}
              >
                Verify Email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </>
  )
}
