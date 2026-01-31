import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Check, X, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AnimatedSection from '@/components/AnimatedSection'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp, isAuthenticated } = useAuth()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  if (isAuthenticated) {
    return null
  }

  // Email validation function
  const validateEmail = (email) => {
    if (!email || !email.trim()) {
      return { valid: false, error: 'Email is required' }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return { valid: false, error: 'Invalid email format' }
    }
    
    // Check for common invalid patterns
    const trimmedEmail = email.trim().toLowerCase()
    if (trimmedEmail.includes('..')) {
      return { valid: false, error: 'Email cannot contain consecutive dots' }
    }
    
    if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      return { valid: false, error: 'Email cannot start or end with a dot' }
    }
    
    if (trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) {
      return { valid: false, error: 'Invalid email format' }
    }
    
    // Check domain
    const parts = trimmedEmail.split('@')
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid email format' }
    }
    
    const [localPart, domain] = parts
    if (localPart.length === 0 || localPart.length > 64) {
      return { valid: false, error: 'Email local part must be between 1 and 64 characters' }
    }
    
    if (domain.length === 0 || domain.length > 255) {
      return { valid: false, error: 'Email domain must be between 1 and 255 characters' }
    }
    
    if (!domain.includes('.')) {
      return { valid: false, error: 'Email domain must contain a dot' }
    }
    
    // Check for valid TLD (at least 2 characters after last dot)
    const domainParts = domain.split('.')
    const tld = domainParts[domainParts.length - 1]
    if (tld.length < 2) {
      return { valid: false, error: 'Email must have a valid domain extension' }
    }
    
    // Check for common disposable email patterns (optional - can be expanded)
    const disposableDomains = ['tempmail', 'throwaway', 'guerrillamail', '10minutemail', 'mailinator', 'yopmail']
    if (disposableDomains.some(disposable => domain.includes(disposable))) {
      return { valid: false, error: 'Disposable email addresses are not allowed' }
    }
    
    return { valid: true, error: null }
  }

  const passwordRequirements = [
    { label: 'At least 6 characters', test: (p) => p.length >= 6 },
    { label: 'Contains uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { label: 'Contains lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { label: 'Contains a number (0-9)', test: (p) => /[0-9]/.test(p) },
  ]

  const emailValidation = validateEmail(formData.email)
  const isPasswordValid = passwordRequirements.every(req => req.test(formData.password))
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== ''

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return
    }
    // Email validation
    const emailCheck = validateEmail(formData.email)
    if (!emailCheck.valid) {
      setError(emailCheck.error)
      return
    }
    
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements')
      return
    }
    if (!doPasswordsMatch) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Normalize email: trim and lowercase
      const normalizedEmail = formData.email.trim().toLowerCase()
      
      const result = await signUp(normalizedEmail, formData.password, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      })
      
      setSuccess(true)
      toast({
        title: 'Verification email sent!',
        description: 'Please check your email to verify your account and complete signup.',
      })
      
      // Redirect to email verification page
      setTimeout(() => {
        navigate('/auth/verify-email')
      }, 1500)
    } catch (err) {
      console.error('Sign up error:', err)
      let errorMessage = err.message || 'Failed to create account. Please try again.'
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.'
      } else if (err.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Authentication is not configured. Please enable Email/Password in Firebase Console.'
      }
      
      setError(errorMessage)
      toast({
        title: 'Sign up failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 animated-gradient opacity-50" />
      <div className="fixed inset-0 grid-pattern" />
      
      {/* Beautiful Floating Orbs */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-primary/15 rounded-full blur-[120px] float-enhanced opacity-50" />
      <div className="fixed bottom-20 right-10 w-[500px] h-[500px] bg-secondary/12 rounded-full blur-[150px] float-enhanced opacity-40" style={{ animationDelay: '-4s' }} />

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
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 glow magnetic">
                  <span className="text-2xl font-bold text-primary/80">H</span>
            </div>
            <div className="space-y-2">
                  <h1 className="text-4xl font-semibold tracking-tight">
                    <span className="gradient-text">HouseHoppers</span>
              </h1>
                  <p className="text-foreground/50 text-base tracking-wide">Create your account</p>
            </div>
          </div>
            </AnimatedSection>

            {/* Alerts */}
          {success && (
              <Alert className="animate-in fade-in slide-in-from-top-2 border-primary/50 bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                Account created successfully! Redirecting...
              </AlertDescription>
            </Alert>
          )}

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
                  <Sparkles className="w-5 h-5 text-primary spin-slow" />
                  <h2 className="text-xl font-semibold text-foreground">Create Account</h2>
                </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground/80">First Name *</Label>
                    <Input
                      id="firstName"
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="bg-input/50 border-border/50 focus:border-primary/50 rounded-xl h-12"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground/80">Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="bg-input/50 border-border/50 focus:border-primary/50 rounded-xl h-12"
                        required
                      />
                    </div>
                  </div>

                {/* Email */}
                  <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/80">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`bg-input/50 border-border/50 focus:border-primary/50 rounded-xl h-12 ${
                      formData.email && !emailValidation.valid ? 'border-destructive' : ''
                    } ${
                      formData.email && emailValidation.valid ? 'border-primary/50' : ''
                    }`}
                      required
                    />
                  {formData.email && !emailValidation.valid && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {emailValidation.error}
                    </p>
                  )}
                  {formData.email && emailValidation.valid && (
                    <p className="text-sm text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid email address
                    </p>
                  )}
                  </div>

                {/* Password */}
                  <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/80">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                      className="bg-input/50 border-border/50 focus:border-primary/50 rounded-xl h-12 pr-12"
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
                    
                  {/* Password Requirements */}
                  <div className="mt-3 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    <p className="text-xs font-medium text-foreground/60">Password must contain:</p>
                      {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                          {req.test(formData.password) ? (
                          <Check className="h-4 w-4 text-primary" />
                          ) : (
                          <X className="h-4 w-4 text-foreground/30" />
                          )}
                        <span className={req.test(formData.password) ? 'text-primary' : 'text-foreground/40'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                {/* Confirm Password */}
                  <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground/80">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`bg-input/50 border-border/50 focus:border-primary/50 rounded-xl h-12 pr-12 ${
                        formData.confirmPassword && !doPasswordsMatch ? 'border-destructive' : ''
                      }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                      >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.confirmPassword && !doPasswordsMatch && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <X className="h-4 w-4" />
                        Passwords do not match
                      </p>
                    )}
                  {doPasswordsMatch && formData.confirmPassword && (
                    <p className="text-sm text-primary flex items-center gap-1">
                      <Check className="h-4 w-4" />
                        Passwords match
                      </p>
                    )}
                  </div>

                {/* Submit Button */}
                  <Button 
                    type="submit" 
                  className="w-full btn-gradient rounded-xl h-12 text-lg font-semibold text-background magnetic ripple" 
                    disabled={loading || !isPasswordValid || !doPasswordsMatch}
                  >
                    {loading ? (
                      <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </div>
            </AnimatedSection>

            {/* Sign In Link */}
            <div className="text-center text-foreground/60 animate-in fade-in slide-in-from-bottom-4 duration-1000" style={{ animationDelay: '200ms' }}>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/auth/signin')}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Sign in
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
