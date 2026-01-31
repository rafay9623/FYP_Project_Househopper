import { validateSignupData, sanitizeUserForResponse } from '../models/user.js'
import * as authService from '../Services/auth.js'
import * as pendingSignupService from '../Services/pendingSignup.js'
import * as emailService from '../Services/emailService.js'
import { getAuth, getFirestore } from '../Configs/firebase_config.js'

/**
 * Auth Controller - Handles HTTP requests/responses for authentication
 */

/**
 * POST /api/auth/signup
 * Create user profile in Firestore database
 * 
 * Flow:
 * 1. Frontend creates Firebase Auth account (client-side)
 * 2. Frontend sends idToken to backend
 * 3. Backend verifies token and creates/updates user document in Firestore 'users' collection
 * 4. User document contains: uid, email, firstName, lastName, displayName, phoneNumber, etc.
 * 5. User must verify email before account becomes active (isActive: true)
 * 
 * This ensures every user has a corresponding document in the Firestore 'users' collection
 */
export async function signup(req, res) {
  try {
    const { email, password, firstName, lastName, displayName, phoneNumber, idToken } = req.body

    // If idToken is provided, user already created account on frontend
    // Create or update the Firestore profile
    if (idToken) {
      try {
        console.log('🔐 Processing signup with idToken...')
        
        const auth = getAuth()
        if (!auth) {
          throw new Error('Firebase Auth is not initialized')
        }
        
        const db = getFirestore()
        if (!db) {
          throw new Error('Firestore is not initialized')
        }
        
        console.log('✅ Firebase services initialized')
        
        // Verify the token
        console.log('🔍 Verifying idToken...')
        const decodedToken = await auth.verifyIdToken(idToken)
        const uid = decodedToken.uid
        console.log(`✅ Token verified for UID: ${uid}`)

        // Get user record from Firebase Auth
        console.log(`🔍 Fetching user record for UID: ${uid}`)
        const userRecord = await auth.getUser(uid)
        console.log(`✅ User record retrieved: ${userRecord.email}`)

        // Check if user document already exists
        console.log(`🔍 Checking if user document exists in Firestore 'users' collection...`)
        const userDocRef = db.collection('users').doc(uid)
        const existingDoc = await userDocRef.get()
        console.log(`📄 Document exists: ${existingDoc.exists}`)

        // Prepare user document with all credentials
        const userDoc = {
          uid: userRecord.uid,
          email: userRecord.email || email || '',
          emailVerified: userRecord.emailVerified || false,
          firstName: firstName || userRecord.displayName?.split(' ')[0] || '',
          lastName: lastName || userRecord.displayName?.split(' ').slice(1).join(' ') || '',
          displayName: displayName || userRecord.displayName || `${firstName || ''} ${lastName || ''}`.trim() || '',
          role: 'user',
          isActive: userRecord.emailVerified || false, // Active only if email verified
          updatedAt: new Date().toISOString(),
          // Only include phoneNumber if provided and not empty
          ...(phoneNumber && phoneNumber.trim() && { phoneNumber: phoneNumber.trim() })
        }

        // If document exists, update it (preserve createdAt)
        if (existingDoc.exists) {
          console.log(`📝 Updating existing user document...`)
          const existingData = existingDoc.data()
          userDoc.createdAt = existingData.createdAt || new Date().toISOString()
          // Merge with existing data to preserve any additional fields
          await userDocRef.set({
            ...existingData,
            ...userDoc
          }, { merge: true })
          console.log(`✅ Firestore profile updated for: ${userRecord.email}`)
        } else {
          // Create new document
          console.log(`📝 Creating new user document in 'users' collection...`)
          userDoc.createdAt = new Date().toISOString()
          console.log(`📄 User document to create:`, JSON.stringify(userDoc, null, 2))
          
          await userDocRef.set(userDoc)
          console.log(`✅ Firestore profile created for: ${userRecord.email} (UID: ${uid})`)
        }

        // Verify the document was created/updated successfully
        const verifyDoc = await userDocRef.get()
        if (!verifyDoc.exists) {
          console.error('❌ CRITICAL: User document verification failed - document does not exist after creation')
          throw new Error('Failed to create user document in Firestore - verification failed')
        }

        const finalUserDoc = verifyDoc.data()
        console.log(`✅✅✅ User document verified in Firestore: ${userRecord.email} (UID: ${uid})`)
        console.log(`📄 Document data:`, JSON.stringify(finalUserDoc, null, 2))

        return res.status(200).json({
          success: true,
          message: 'User profile created successfully. Please verify your email to activate your account.',
          user: finalUserDoc
        })
      } catch (tokenError) {
        console.error('❌ Error creating Firestore profile:', tokenError)
        console.error('❌ Error details:', {
          message: tokenError.message,
          code: tokenError.code,
          stack: tokenError.stack
        })
        
        // Handle specific Firebase errors
        if (tokenError.code === 'auth/id-token-expired') {
          return res.status(401).json({
            success: false,
            error: 'Token expired. Please try signing up again.'
          })
        }
        
        if (tokenError.code === 'auth/id-token-revoked') {
          return res.status(401).json({
            success: false,
            error: 'Token revoked. Please try signing up again.'
          })
        }
        
        if (tokenError.code === 'auth/argument-error') {
          return res.status(400).json({
            success: false,
            error: 'Invalid token format.'
          })
        }

        // Return error response
        return res.status(500).json({
          success: false,
          error: tokenError.message || 'Failed to create user profile in Firestore',
          code: tokenError.code || 'unknown'
        })
      }
    }

    // Old flow: create account on backend (fallback)
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      })
    }

    // Normalize and validate email
    const normalizedEmail = email.trim().toLowerCase()
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
    }
    
    // Additional email checks
    if (normalizedEmail.includes('..')) {
      return res.status(400).json({
        success: false,
        error: 'Email cannot contain consecutive dots'
      })
    }
    
    if (normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
      return res.status(400).json({
        success: false,
        error: 'Email cannot start or end with a dot'
      })
    }
    
    const emailParts = normalizedEmail.split('@')
    if (emailParts.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
    }
    
    const [localPart, domain] = emailParts
    if (localPart.length === 0 || localPart.length > 64) {
      return res.status(400).json({
        success: false,
        error: 'Email local part must be between 1 and 64 characters'
      })
    }
    
    if (domain.length === 0 || domain.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Email domain must be between 1 and 255 characters'
      })
    }
    
    if (!domain.includes('.')) {
      return res.status(400).json({
        success: false,
        error: 'Email domain must contain a dot'
      })
    }
    
    const domainParts = domain.split('.')
    const tld = domainParts[domainParts.length - 1]
    if (tld.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Email must have a valid domain extension'
      })
    }

    // Validate input
    const validation = validateSignupData({ email: normalizedEmail, password })
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      })
    }

    // Check if user already exists in Firebase Auth
    try {
      const auth = getAuth()
      await auth.getUserByEmail(normalizedEmail)
      // If we get here, user already exists
      return res.status(409).json({
        success: false,
        error: 'Email already registered. Please sign in instead.'
      })
    } catch (error) {
      // User doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        throw error
      }
    }

    // Fallback: User might be created in Firebase Auth (from frontend)
    // Try to get user and create/sync the Firestore profile
    const auth = getAuth()
    const db = getFirestore()
    
    try {
      // Try to get user from Firebase Auth
      const userRecord = await auth.getUserByEmail(normalizedEmail)
      
      // Prepare user profile with all credentials
      const userProfile = {
        uid: userRecord.uid,
        email: normalizedEmail,
        emailVerified: userRecord.emailVerified || false,
        firstName: firstName || userRecord.displayName?.split(' ')[0] || '',
        lastName: lastName || userRecord.displayName?.split(' ').slice(1).join(' ') || '',
        displayName: displayName || userRecord.displayName || `${firstName || ''} ${lastName || ''}`.trim() || '',
        role: 'user',
        isActive: userRecord.emailVerified || false, // Active only if email verified
        updatedAt: new Date().toISOString(),
        // Store phone number if provided
        ...(phoneNumber && phoneNumber.trim() && { phoneNumber: phoneNumber.trim() })
      }

      // Check if profile already exists
      const userDocRef = db.collection('users').doc(userRecord.uid)
      const existingDoc = await userDocRef.get()
      
      if (existingDoc.exists) {
        // Update existing profile (preserve createdAt)
        const existingData = existingDoc.data()
        userProfile.createdAt = existingData.createdAt || new Date().toISOString()
        await userDocRef.set({
          ...existingData,
          ...userProfile
        }, { merge: true })
        console.log(`✅ User profile updated for: ${normalizedEmail}`)
      } else {
        // Create new profile
        userProfile.createdAt = new Date().toISOString()
        await userDocRef.set(userProfile)
        console.log(`✅ User profile created for: ${normalizedEmail}`)
      }

      // Verify the document was created/updated successfully
      const verifyDoc = await userDocRef.get()
      if (!verifyDoc.exists) {
        throw new Error('Failed to create user document in Firestore')
      }

      console.log(`📧 Verification email already sent by Firebase client`)

      res.status(200).json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: verifyDoc.data()
      })
    } catch (error) {
      console.error('❌ Error creating user profile:', error)
      
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({
          success: false,
          error: 'User not found in Firebase Auth. Please create an account first.'
        })
      }
      
      // Re-throw to be handled by outer catch
      throw error
    }
  } catch (error) {
    console.error('Signup error:', error)
    
    if (error.code === 'auth/email-already-exists' || error.code === 'auth/email-already-in-use') {
      return res.status(409).json({
        success: false,
        error: 'Email already in use'
      })
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate signup'
    })
  }
}

/**
 * POST /api/auth/verify-email
 * Complete user profile after email verification
 * Called after Firebase verifies the email on the frontend
 */
export async function verifyEmail(req, res) {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token is required'
      })
    }

    const auth = getAuth()
    const db = getFirestore()

    try {
      // Verify the token to get user info
      const decodedToken = await auth.verifyIdToken(idToken)
      const uid = decodedToken.uid

      // Get user record from Firebase Auth
      const userRecord = await auth.getUser(uid)

      // Check if email is verified
      if (!userRecord.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is not verified yet. Please verify your email first.'
        })
      }

      // Check if user document exists in Firestore
      const userDocRef = db.collection('users').doc(uid)
      const userDoc = await userDocRef.get()
      
      let user
      if (!userDoc.exists) {
        // Create user document if it doesn't exist
        console.log(`⚠️ User document not found for ${uid}, creating profile...`)
        const newUserDoc = {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: true,
          firstName: userRecord.displayName?.split(' ')[0] || '',
          lastName: userRecord.displayName?.split(' ').slice(1).join(' ') || '',
          displayName: userRecord.displayName || '',
          role: 'user',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(userRecord.phoneNumber && { phoneNumber: userRecord.phoneNumber })
        }
        await userDocRef.set(newUserDoc)
        user = newUserDoc
      } else {
        // Update existing Firestore profile to mark as verified and active
        await userDocRef.update({
          emailVerified: true,
          isActive: true,
          updatedAt: new Date().toISOString()
        })
        // Get updated user profile
        const updatedDoc = await userDocRef.get()
        user = updatedDoc.data()
      }

      console.log(`✅ Email verified and profile activated for user: ${userRecord.email}`)

      res.status(200).json({
        success: true,
        message: 'Email verified successfully! Your account is now active.',
        user: sanitizeUserForResponse(user)
      })
    } catch (tokenError) {
      console.error('Token verification error:', tokenError.message)
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please sign in again.'
      })
    }
  } catch (error) {
    console.error('Verify email error:', error)
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify email'
    })
  }
}

/**
 * POST /api/auth/login
 * Verify token and get user data
 */
export async function login(req, res) {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token is required'
      })
    }

    // Verify the token
    const tokenResult = await authService.verifyToken(idToken)
    
    if (!tokenResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    // Get user data from Firestore
    let user = await authService.getUserById(tokenResult.uid)
    
    // If user doesn't exist in Firestore but exists in Firebase Auth, create it
    if (!user) {
      console.log(`⚠️ User ${tokenResult.uid} not found in Firestore, creating profile...`)
      try {
        const auth = getAuth()
        const userRecord = await auth.getUser(tokenResult.uid)
        const db = getFirestore()
        
        const userDoc = {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified || false,
          firstName: userRecord.displayName?.split(' ')[0] || '',
          lastName: userRecord.displayName?.split(' ').slice(1).join(' ') || '',
          displayName: userRecord.displayName || '',
          role: 'user',
          isActive: userRecord.emailVerified || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(userRecord.phoneNumber && { phoneNumber: userRecord.phoneNumber })
        }
        
        await db.collection('users').doc(userRecord.uid).set(userDoc)
        user = { id: userRecord.uid, ...userDoc }
        console.log(`✅ Created Firestore profile for user: ${userRecord.email}`)
      } catch (createError) {
        console.error('Error creating user profile:', createError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile'
        })
      }
    }

    // Update last login
    await authService.updateLastLogin(tokenResult.uid)

    res.json({
      success: true,
      message: 'Login successful',
      user: sanitizeUserForResponse(user)
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
}

/**
 * GET /api/auth/profile
 * Get current user profile (requires authentication)
 */
export async function getProfile(req, res) {
  try {
    const { uid, email } = req.user
    
    console.log(`🔍 Fetching profile for user: ${uid} (${email})`)

    let user = await authService.getUserById(uid)
    
    // If user doesn't exist in Firestore but exists in Firebase Auth, create it
    if (!user) {
      console.log(`⚠️ User ${uid} not found in Firestore, creating profile...`)
      try {
        const auth = getAuth()
        const userRecord = await auth.getUser(uid)
        const db = getFirestore()
        
        const userDoc = {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified || false,
          firstName: userRecord.displayName?.split(' ')[0] || '',
          lastName: userRecord.displayName?.split(' ').slice(1).join(' ') || '',
          displayName: userRecord.displayName || '',
          role: 'user',
          isActive: userRecord.emailVerified || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(userRecord.phoneNumber && { phoneNumber: userRecord.phoneNumber })
        }
        
        await db.collection('users').doc(userRecord.uid).set(userDoc)
        user = { id: userRecord.uid, ...userDoc }
        console.log(`✅ Created Firestore profile for user: ${userRecord.email}`)
      } catch (createError) {
        console.error('Error creating user profile:', createError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile'
        })
      }
    }

    // Verify the user data matches the authenticated user
    if (user.uid !== uid && user.id !== uid) {
      console.error(`❌ User ID mismatch! Requested: ${uid}, Found: ${user.uid || user.id}`)
      return res.status(403).json({
        success: false,
        error: 'Access denied - user ID mismatch'
      })
    }

    console.log(`✅ Profile fetched successfully for user: ${user.email} (UID: ${user.uid || user.id})`)

    res.json({
      success: true,
      user: sanitizeUserForResponse(user)
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    })
  }
}

/**
 * PUT /api/auth/profile
 * Update current user profile (requires authentication)
 */
export async function updateProfile(req, res) {
  try {
    const { uid } = req.user
    const updateData = req.body

    // Don't allow updating certain fields
    delete updateData.uid
    delete updateData.role
    delete updateData.createdAt

    const result = await authService.updateUser(uid, updateData)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUserForResponse(result.user)
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    })
  }
}

/**
 * DELETE /api/auth/account
 * Delete current user account (requires authentication)
 */
export async function deleteAccount(req, res) {
  try {
    const { uid } = req.user

    await authService.deleteUser(uid)

    res.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    })
  }
}

/**
 * POST /api/auth/logout
 * Logout user (clear any server-side session)
 */
export async function logout(req, res) {
  try {
    res.clearCookie('token')
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    })
  }
}

/**
 * POST /api/auth/verify-token
 * Verify a Firebase ID token
 */
export async function verifyToken(req, res) {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token is required'
      })
    }

    const result = await authService.verifyToken(idToken)
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      })
    }

    res.json({
      success: true,
      uid: result.uid
    })
  } catch (error) {
    console.error('Verify token error:', error)
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    })
  }
}

/**
 * GET /api/auth/test-firestore
 * Test endpoint to verify Firestore is working and create users collection
 */
export async function testFirestore(req, res) {
  try {
    const db = getFirestore()
    const auth = getAuth()
    
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Firestore is not initialized'
      })
    }
    
    // Try to create a test document in users collection
    const testDoc = {
      test: true,
      message: 'Firestore is working',
      timestamp: new Date().toISOString()
    }
    
    await db.collection('users').doc('test').set(testDoc)
    
    // Verify it was created
    const verifyDoc = await db.collection('users').doc('test').get()
    
    if (verifyDoc.exists) {
      // Clean up test document
      await db.collection('users').doc('test').delete()
      
      return res.json({
        success: true,
        message: 'Firestore is working correctly. Users collection can be created.',
        firestoreInitialized: true,
        authInitialized: !!auth
      })
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify Firestore write'
      })
    }
  } catch (error) {
    console.error('Test Firestore error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Firestore test failed',
      details: error.code || 'unknown'
    })
  }
}

/**
 * GET /api/auth/test-user-data
 * Test endpoint to verify user data fetching is correct
 * Requires authentication
 */
export async function testUserData(req, res) {
  try {
    const { uid, email } = req.user
    
    if (!uid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    console.log(`🧪 Testing user data fetch for: ${uid} (${email})`)

    const db = getFirestore()
    const auth = getAuth()

    // 1. Test fetching user profile
    const userDoc = await db.collection('users').doc(uid).get()
    const userExists = userDoc.exists
    const userData = userDoc.exists ? userDoc.data() : null

    // 2. Test fetching user's properties
    const propertiesSnapshot = await db
      .collection('properties')
      .where('userId', '==', uid)
      .get()
    
    const userProperties = propertiesSnapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId,
      name: doc.data().name || 'Unnamed'
    }))

    // 3. Verify user ID matches
    const userIdMatch = userData ? (userData.uid === uid || userDoc.id === uid) : false

    // 4. Verify all properties belong to user
    const allPropertiesMatch = userProperties.every(p => p.userId === uid)

    // 5. Get Firebase Auth user record
    let firebaseAuthUser = null
    try {
      firebaseAuthUser = await auth.getUser(uid)
    } catch (error) {
      console.error('Error fetching Firebase Auth user:', error)
    }

    return res.json({
      success: true,
      test: {
        authenticatedUser: {
          uid,
          email
        },
        firestoreUser: {
          exists: userExists,
          uid: userData?.uid || null,
          email: userData?.email || null,
          userIdMatch
        },
        firebaseAuthUser: {
          exists: !!firebaseAuthUser,
          uid: firebaseAuthUser?.uid || null,
          email: firebaseAuthUser?.email || null
        },
        properties: {
          count: userProperties.length,
          allMatch: allPropertiesMatch,
          items: userProperties
        },
        validation: {
          userDataCorrect: userIdMatch && userExists,
          propertiesCorrect: allPropertiesMatch,
          allCorrect: userIdMatch && userExists && allPropertiesMatch
        }
      }
    })
  } catch (error) {
    console.error('Test user data error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Test failed',
      details: error.code || 'unknown'
    })
  }
}

export default {
  signup,
  verifyEmail,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  logout,
  verifyToken,
  testFirestore,
  testUserData
}

