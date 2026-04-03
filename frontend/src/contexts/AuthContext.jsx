import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload
} from 'firebase/auth'
import { auth } from '@/config/firebase.config'
import { authApi } from '@/services/api.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    // Check if auth is available
    if (!auth) {
      console.error('Firebase Auth not initialized')
      setLoading(false)
      return
    }

    // Hydrate admin session from localStorage
    const adminSession = localStorage.getItem('__admin_session__')
    if (adminSession) {
      const parsed = JSON.parse(adminSession)
      setUser(parsed.user)
      setUserProfile(parsed.profile)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Reload user to get latest email verification status
        try {
          await firebaseUser.reload()
        } catch (reloadError) {
          console.warn('Failed to reload user:', reloadError)
        }

        setUser(firebaseUser)
        // Get user profile from backend
        try {
          const idToken = await firebaseUser.getIdToken()
          const profile = await authApi.getProfile(idToken)
          setUserProfile(profile.user)
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
          setUserProfile(null)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const ADMIN_EMAIL = 'youngdumbrokedie@gmail.com'
  const ADMIN_PASSWORD = 'rafayhadizahid_1'

  const signIn = async (email, password) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not initialized')
    }

    // Admin bypass — account does not exist in Firebase Auth
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = {
        uid: 'admin-uid',
        email: ADMIN_EMAIL,
        emailVerified: true,
        displayName: 'System Admin',
        getIdToken: async () => 'admin-token',
      }
      const adminProfile = {
        _id: 'admin-profile',
        email: ADMIN_EMAIL,
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
      }
      setUser(adminUser)
      setUserProfile(adminProfile)
      localStorage.setItem('__admin_session__', JSON.stringify({ user: adminUser, profile: adminProfile }))
      return adminUser
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user

    // Reload user to get latest verification status
    await reload(firebaseUser)

    // Check if email is verified
    if (!firebaseUser.emailVerified) {
      // Sign out user if email not verified
      await firebaseSignOut(auth)
      throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
    }

    const idToken = await firebaseUser.getIdToken()

    // Verify token with backend and get user profile
    try {
      const result = await authApi.login(idToken)
      if (result.user) {
        setUserProfile(result.user)
      }
    } catch (error) {
      console.error('Backend login error:', error)
    }

    // Explicitly set user state so isAuthenticated becomes true BEFORE
    // the caller navigates away. onAuthStateChanged will also fire but
    // setting it here avoids the race condition where navigate happens
    // before the listener runs.
    setUser(firebaseUser)

    return firebaseUser
  }

  const signUp = async (email, password, userData = {}) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not initialized')
    }

    console.log('🔐 Initiating signup...', { email })

    try {
      // Step 1: Create Firebase Auth account on client side
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      console.log('✅ Firebase Auth account created:', user.uid)

      // Step 2: Send email verification (Firebase sends email automatically)
      await sendEmailVerification(user, {
        url: `${window.location.origin}/auth/verify-email`,
        handleCodeInApp: false
      })

      console.log('✅ Verification email sent via Firebase')

      // Step 3: Update display name
      if (userData.firstName && userData.lastName) {
        await firebaseUpdateProfile(user, {
          displayName: `${userData.firstName} ${userData.lastName}`
        })
      }

      // Step 4: Create user profile in backend (with emailVerified: false)
      // This MUST succeed - retry if it fails
      let profileCreated = false
      let retries = 3

      while (!profileCreated && retries > 0) {
        try {
          const idToken = await user.getIdToken()
          console.log('📤 Sending signup request to backend with idToken...')

          const result = await authApi.signup(email, password, {
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            phoneNumber: userData.phoneNumber
          }, idToken) // Pass idToken to create Firestore document

          console.log('📥 Backend response:', result)

          if (result.success && result.user) {
            console.log('✅ Firestore profile created successfully:', result.user.uid)
            profileCreated = true
          } else {
            throw new Error('Backend returned success=false')
          }
        } catch (backendError) {
          console.error(`❌ Backend profile creation failed (${retries} retries left):`, backendError)
          retries--

          if (retries === 0) {
            // Last attempt failed - this is critical, we need to ensure document is created
            console.error('❌ CRITICAL: Failed to create Firestore profile after 3 attempts')
            // Don't throw here - let the user continue, but log the error
            // The document will be created on first login via the login endpoint
            throw new Error('Failed to create user profile. Please try logging in after verifying your email.')
          }

          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Step 5: Sign out (user must verify email before signing in)
      await firebaseSignOut(auth)

      console.log('✅ User signed out. Email verification required.')

      return {
        email,
        message: 'Verification email sent. Please check your inbox.'
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const resendVerificationEmail = async () => {
    if (!auth || !auth.currentUser) {
      throw new Error('No user is currently signed in')
    }

    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/auth/verify-email`,
        handleCodeInApp: false
      })
      console.log('✅ Verification email resent')
      return true
    } catch (error) {
      console.error('❌ Failed to resend verification email:', error)
      throw error
    }
  }

  const sendPasswordReset = async (email) => {
    if (!auth) {
      throw new Error('Firebase Authentication is not initialized')
    }

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/signin`,
        handleCodeInApp: false
      })
      console.log('✅ Password reset email sent to:', email)
      return true
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error)
      throw error
    }
  }

  const signOut = async () => {
    localStorage.removeItem('__admin_session__')
    if (auth) {
      await firebaseSignOut(auth)
    }
    setUser(null)
    setUserProfile(null)
  }

  const getToken = async () => {
    if (user) {
      return await user.getIdToken()
    }
    return null
  }

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false,
    signIn,
    signUp,
    signOut,
    getToken,
    resendVerificationEmail,
    sendPasswordReset
  }), [user, userProfile, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
