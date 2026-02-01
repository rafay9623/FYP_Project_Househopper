import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Loader2, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AnimatedSection from '@/components/AnimatedSection'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/config/firebase.config'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function SignInPage() {
  const navigate = useNavigate()
  const { signIn, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  if (isAuthenticated) {
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)

      toast({
        title: 'Welcome back!',
        description: 'You have been successfully signed in.',
      })
      navigate('/dashboard')
    } catch (err) {
      console.error('Sign in error:', err)
      let errorMessage = err.message || 'Failed to sign in. Please check your credentials.'

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.'
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.'
      } else if (err.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication is not configured. Please enable Email/Password in Firebase Console.'
      } else if (err.message && err.message.includes('verify your email')) {
        // Custom error from AuthContext
        errorMessage = err.message
        setTimeout(() => {
          navigate('/auth/verify-email')
        }, 1500)
      }

      setError(errorMessage)
      toast({
        title: 'Sign in failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    if (!resetEmail) return

    setResetLoading(true)
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      toast({
        title: 'Email Sent',
        description: 'Check your email for password reset instructions.',
      })
      setIsResetDialogOpen(false)
      setResetEmail('')
    } catch (error) {
      console.error('Password reset error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email.',
        variant: 'destructive',
      })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 animated-gradient opacity-50" />
      <div className="fixed inset-0 grid-pattern" />

      {/* Beautiful Floating Orbs */}
      <div className="fixed top-20 right-10 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] float-enhanced opacity-50" />
      <div className="fixed bottom-20 left-10 w-[500px] h-[500px] bg-primary/12 rounded-full blur-[150px] float-enhanced opacity-40" style={{ animationDelay: '-4s' }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-border/50 glass">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-md space-y-8">
            {/* Logo & Title */}
            <AnimatedSection animation="fade-in-up" delay={0}>
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-secondary/10 border border-secondary/20 glow-purple magnetic">
                  <span className="text-2xl font-bold text-secondary/80">H</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-semibold tracking-tight">
                    <span className="gradient-text">HouseHoppers</span>
                  </h1>
                  <p className="text-foreground/50 text-base tracking-wide">Welcome back</p>
                </div>
              </div>
            </AnimatedSection>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Form Card */}
            <AnimatedSection animation="scale-in" delay={100}>
              <div className="glass-card rounded-3xl p-8 tilt-3d">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-secondary spin-slow" />
                  <h2 className="text-xl font-semibold text-foreground">Sign In</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground/80">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-input/50 border-border/50 focus:border-secondary/50 rounded-xl h-12"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground/80">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-input/50 border-border/50 focus:border-secondary/50 rounded-xl h-12 pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={() => setIsResetDialogOpen(true)} className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors">
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 rounded-xl h-12 text-lg font-semibold text-secondary-foreground magnetic ripple"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </div>
            </AnimatedSection>

            {/* Sign Up Link */}
            <div className="text-center text-foreground/60 animate-in fade-in slide-in-from-bottom-4 duration-1000" style={{ animationDelay: '200ms' }}>
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/auth/signup')}
                className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Forgot Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setIsResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
