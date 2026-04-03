import { getFirestore } from '../config/firebase_config.js'
import crypto from 'crypto'

const PENDING_SIGNUPS_COLLECTION = 'pending_signups'

/**
 * Generate a secure verification token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Store pending signup data
 */
export async function createPendingSignup(email, password, userData = {}) {
  const db = getFirestore()
  
  try {
    // Check if email already exists in pending signups
    const existingSnapshot = await db
      .collection(PENDING_SIGNUPS_COLLECTION)
      .where('email', '==', email)
      .get()

    if (!existingSnapshot.empty) {
      // Update existing pending signup
      const existingDoc = existingSnapshot.docs[0]
      const verificationToken = generateVerificationToken()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      const updateData = {
        password, // Store hashed password in production
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        verificationToken,
        expiresAt: expiresAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Only include phoneNumber if it's provided and not empty
      if (userData.phoneNumber && userData.phoneNumber.trim()) {
        updateData.phoneNumber = userData.phoneNumber.trim()
      }
      
      await existingDoc.ref.update(updateData)

      return {
        success: true,
        verificationToken,
        email,
        expiresAt
      }
    }

    // Create new pending signup
    const verificationToken = generateVerificationToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const pendingSignupData = {
      email: email.trim().toLowerCase(),
      password, // In production, hash this before storing
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      verificationToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verified: false
    }
    
    // Only include phoneNumber if it's provided and not empty
    if (userData.phoneNumber && userData.phoneNumber.trim()) {
      pendingSignupData.phoneNumber = userData.phoneNumber.trim()
    }

    await db.collection(PENDING_SIGNUPS_COLLECTION).add(pendingSignupData)

    return {
      success: true,
      verificationToken,
      email,
      expiresAt
    }
  } catch (error) {
    console.error('❌ Create pending signup error:', error.message)
    throw error
  }
}

/**
 * Get pending signup by verification token
 */
export async function getPendingSignupByToken(verificationToken) {
  const db = getFirestore()

  try {
    const snapshot = await db
      .collection(PENDING_SIGNUPS_COLLECTION)
      .where('verificationToken', '==', verificationToken)
      .where('verified', '==', false)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    // Check if token has expired
    const expiresAt = new Date(data.expiresAt)
    if (expiresAt < new Date()) {
      return null // Token expired
    }

    return {
      id: doc.id,
      ...data
    }
  } catch (error) {
    console.error('❌ Get pending signup error:', error.message)
    throw error
  }
}

/**
 * Mark pending signup as verified and create account
 */
export async function markPendingSignupAsVerified(pendingSignupId) {
  const db = getFirestore()

  try {
    await db
      .collection(PENDING_SIGNUPS_COLLECTION)
      .doc(pendingSignupId)
      .update({
        verified: true,
        verifiedAt: new Date().toISOString()
      })
  } catch (error) {
    console.error('❌ Mark pending signup as verified error:', error.message)
    throw error
  }
}

/**
 * Delete expired pending signups (cleanup job)
 */
export async function deleteExpiredPendingSignups() {
  const db = getFirestore()

  try {
    const now = new Date()
    const snapshot = await db
      .collection(PENDING_SIGNUPS_COLLECTION)
      .where('expiresAt', '<', now.toISOString())
      .where('verified', '==', false)
      .get()

    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`✅ Deleted ${snapshot.docs.length} expired pending signups`)
  } catch (error) {
    console.error('❌ Delete expired pending signups error:', error.message)
    throw error
  }
}

