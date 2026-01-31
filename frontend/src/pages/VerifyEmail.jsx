import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/services/api.service'
import { auth } from '@/config/firebase.config'
import { applyActionCode, verifyPasswordResetCode } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AnimatedSection from '@/components/AnimatedSection'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const verificationToken = searchParams.get('token')
  const { user, isEmailVerified, resendVerificationEmail, signOut } = useAuth()
  const { toast } = useToast()
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // Check for Firebase action code in URL (oobCode parameter)
    const oobCode = searchParams.get('oobCode')
    const mode = searchParams.get('mode')
    
    // If Firebase verification link (from email)
    if (oobCode && mode === 'verifyEmail') {
      handleFirebaseVerification(oobCode)
      return
    }

    // If custom token (from our old system)
    if (verificationToken) {
      handleVerifyToken(verificationToken)
      return
    }

    // Check if user is logged in and email is verified
    if (user) {
      checkVerificationStatus()
      return
    }

    // No code/token - show waiting message
    setChecking(false)
  }, [searchParams, verificationToken, user])

  const handleFirebaseVerification = async (actionCode) => {
    setVerifying(true)
    try {
      // Apply the action code (Firebase verifies the email)
      await applyActionCode(auth, actionCode)
      
      console.log('✅ Email verified via Firebase')
      
      // Sign in the user automatically (they just verified)
      // But wait - user account exists but might not be signed in
      // We need to get the user and complete the profile
      
      // Get current user or sign in
      if (!auth.currentUser) {
        // User needs to sign in with their credentials
        toast({
          title: 'Email verified!',
          description: 'Please sign in with your email and password to complete setup.',
        })
        setTimeout(() => {
          navigate('/auth/signin')
        }, 2000)
        setVerified(true)
      } else {
        // User is already signed in, complete the profile
        const idToken = await auth.currentUser.getIdToken()
        await authApi.verifyEmail(idToken)
        setVerified(true)
        toast({
          title: 'Email verified!',
          description: 'Your account is now active. You can access all features.',
        })
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      }
    } catch (error) {
      console.error('Firebase verification error:', error)
      let errorMessage = 'Invalid or expired verification link.'
      
      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'Verification link has expired. Please request a new verification email.'
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid verification link. Please request a new verification email.'
      }
      
      toast({
        title: 'Verification failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
      setChecking(false)
    }
  }

  const handleVerifyToken = async (token) => {
    setVerifying(true)
    try {
      const result = await authApi.verifyEmail(token)
      setVerified(true)
      toast({
        title: 'Email verified!',
        description: 'Your account has been created. You can now sign in.',
      })
      setTimeout(() => {
        navigate('/auth/signin')
      }, 2000)
    } catch (error) {
      console.error('Verification error:', error)
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid or expired verification token.',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
      setChecking(false)
    }
  }

  const checkVerificationStatus = async () => {
    try {
      await user.reload()
      if (user.emailVerified) {
        setVerified(true)
      }
    } catch (error) {
      console.error('Error checking verification:', error)
    } finally {
      setChecking(false)
    }
  }

  // Resend functionality removed - would need new endpoint
  // For now, user needs to sign up again if they didn't receive email

  if (checking || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-foreground/70">
            {verifying ? 'Verifying email and creating account...' : 'Checking verification status...'}
          </p>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <AnimatedSection className="w-full max-w-md">
          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Account Created!</CardTitle>
              <CardDescription>
                Your email has been verified and your account has been created.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  You can now sign in to access all features of HouseHoppers.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => navigate('/auth/signin')} 
                className="w-full"
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    )
  }

  // Show waiting message if no token
  if (!verificationToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <AnimatedSection className="w-full max-w-md">
          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Verify Your Email</CardTitle>
              <CardDescription>
                We've sent a verification email. Please check your inbox and click the verification link to create your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please check your inbox and click the verification link to activate your account.
                  If you don't see the email, check your spam folder.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Button 
                  onClick={() => navigate('/auth/signin')}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>

                <Button 
                  onClick={() => navigate('/auth/signup')}
                  variant="ghost"
                  className="w-full"
                >
                  Sign Up Again
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder. If you still don't see it, you can sign up again.
                </p>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    )
  }

  return null
}

