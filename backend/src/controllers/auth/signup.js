import { validateSignupData } from '../../models/user.js'
import { ensureFirestoreProfile } from '../../services/auth.js'
import { getAuth, getFirestore } from '../../config/firebase_config.js'

export async function signup(req, res) {
  try {
    const { email, password, firstName, lastName, displayName, phoneNumber, idToken } = req.body

    // Backend validation for names to protect against direct API calls
    const nameRegex = /^[a-zA-Z\s\-']+$/
    
    if (firstName) {
      const fName = firstName.trim()
      if (fName.length < 2 || fName.length > 50) {
        return res.status(400).json({ success: false, error: 'First name must be between 2 and 50 characters' })
      }
      if (!nameRegex.test(fName)) {
        return res.status(400).json({ success: false, error: 'First name can only contain letters, spaces, hyphens, and apostrophes' })
      }
    }
    
    if (lastName) {
      const lName = lastName.trim()
      if (lName.length < 2 || lName.length > 50) {
        return res.status(400).json({ success: false, error: 'Last name must be between 2 and 50 characters' })
      }
      if (!nameRegex.test(lName)) {
        return res.status(400).json({ success: false, error: 'Last name can only contain letters, spaces, hyphens, and apostrophes' })
      }
    }

    if (idToken) {
      try {
        console.log('🔐 Processing signup with idToken...')
        const auth = getAuth()
        const decodedToken = await auth.verifyIdToken(idToken)
        
        const finalUserDoc = await ensureFirestoreProfile(decodedToken.uid, {
          firstName: firstName ? firstName.trim() : undefined,
          lastName: lastName ? lastName.trim() : undefined,
          displayName: displayName ? displayName.trim() : undefined,
          phoneNumber: phoneNumber ? phoneNumber.trim() : undefined
        })

        return res.status(200).json({
          success: true,
          message: 'User profile created successfully. Please verify your email to activate your account.',
          user: finalUserDoc
        })
      } catch (tokenError) {
        console.error('❌ Error creating Firestore profile:', tokenError)
        return res.status(401).json({
          success: false,
          error: `Failed to authenticate token during signup: ${tokenError.message}`
        })
      }
    }

    // Fallback logic for when idToken is not provided
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const validation = validateSignupData({ email: normalizedEmail, password })
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors })
    }

    try {
      const auth = getAuth()
      await auth.getUserByEmail(normalizedEmail)
      return res.status(409).json({ success: false, error: 'Email already registered. Please sign in instead.' })
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error
    }

    try {
      const auth = getAuth()
      const userRecord = await auth.getUserByEmail(normalizedEmail)
      
      const finalUserDoc = await ensureFirestoreProfile(userRecord.uid, {
        firstName: firstName ? firstName.trim() : undefined,
        lastName: lastName ? lastName.trim() : undefined,
        displayName: displayName ? displayName.trim() : undefined,
        phoneNumber: phoneNumber ? phoneNumber.trim() : undefined
      })

      return res.status(200).json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: finalUserDoc
      })
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({
          success: false,
          error: 'User not found in Firebase Auth. Please create an account first.'
        })
      }
      throw error
    }
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to initiate signup' })
  }
}
