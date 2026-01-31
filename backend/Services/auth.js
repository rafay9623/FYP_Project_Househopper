import { getFirestore, getAuth } from '../Configs/firebase_config.js'
import { createUserObject } from '../models/user.js'

const USERS_COLLECTION = 'users'

/**
 * Auth Service - Handles all authentication business logic
 */

/**
 * Create a new user with Firebase Auth and store in Firestore
 * NOTE: This is for admin/server-side user creation
 */
export async function createUser(email, password, userData = {}) {
  const auth = getAuth()
  const db = getFirestore()

  try {
    // Create user in Firebase Auth (emailVerified will be false by default)
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false, // Explicitly set to false - user must verify
      displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      disabled: false, // Account is active but email not verified
      ...(userData.phoneNumber && { phoneNumber: userData.phoneNumber }),
    })

    // Don't create full Firestore profile yet - wait for email verification
    // Store minimal data to track that account exists but is unverified
    const pendingUserDoc = {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: false,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      displayName: userRecord.displayName,
      role: 'user',
      isActive: false, // Not active until email verified
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Store additional data temporarily until verified
      _pendingData: {
        phoneNumber: userData.phoneNumber || null,
        photoURL: userData.photoURL || null,
      }
    }
    
    // Only include phoneNumber if provided
    if (userData.phoneNumber && userData.phoneNumber.trim()) {
      pendingUserDoc.phoneNumber = userData.phoneNumber.trim()
    }

    // Store in Firestore with emailVerified: false and isActive: false
    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set(pendingUserDoc)

    console.log(`✅ Firebase Auth account created (unverified): ${email}`)
    return { 
      success: true, 
      user: pendingUserDoc,
      userRecord: userRecord // Return Firebase Auth record for email verification
    }
  } catch (error) {
    console.error('❌ Create user error:', error.message)
    throw error
  }
}

/**
 * Create or update user record in Firestore from Firebase Auth token
 * Used when user is already created in Firebase Auth (client-side)
 * This ensures the user document always exists in Firestore
 */
export async function createUserFromToken(idToken, userData = {}) {
  const auth = getAuth()
  const db = getFirestore()

  try {
    if (!auth) {
      throw new Error('Firebase Admin Auth is not initialized')
    }

    // Verify the token
    const decodedToken = await auth.verifyIdToken(idToken)
    const uid = decodedToken.uid
    console.log(`✅ Token verified for user: ${uid}`)

    // Get user record from Firebase Auth
    const userRecord = await auth.getUser(uid)
    console.log(`✅ User record retrieved from Firebase Auth: ${userRecord.email}`)

    // Check if user already exists in Firestore
    const userDocRef = db.collection(USERS_COLLECTION).doc(uid)
    const existingDoc = await userDocRef.get()

    // Prepare user document with all data
    const userDoc = createUserObject({
      uid: userRecord.uid,
      email: userRecord.email || decodedToken.email,
      displayName: userRecord.displayName || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      firstName: userData.firstName || userRecord.displayName?.split(' ')[0] || '',
      lastName: userData.lastName || userRecord.displayName?.split(' ').slice(1).join(' ') || '',
      phoneNumber: userData.phoneNumber || userRecord.phoneNumber || '',
      photoURL: userData.photoURL || userRecord.photoURL || '',
      emailVerified: userRecord.emailVerified || false,
      isActive: userRecord.emailVerified || false,
    })

    if (existingDoc.exists) {
      // Update existing document (preserve createdAt)
      const existingData = existingDoc.data()
      userDoc.createdAt = existingData.createdAt || new Date().toISOString()
      await userDocRef.set({
        ...existingData,
        ...userDoc
      }, { merge: true })
      console.log(`✅ User record updated in Firestore: ${userRecord.email}`)
    } else {
      // Create new document
      await userDocRef.set(userDoc)
      console.log(`✅ User record created in Firestore: ${userRecord.email}`)
    }

    // Verify the document exists
    const verifyDoc = await userDocRef.get()
    if (!verifyDoc.exists) {
      throw new Error('Failed to create user document in Firestore')
    }

    return { success: true, user: { id: uid, ...verifyDoc.data() } }
  } catch (error) {
    console.error('❌ Create user from token error:', error.message)
    throw error
  }
}

/**
 * Get user by UID from Firestore
 */
export async function getUserById(uid) {
  const db = getFirestore()

  try {
    const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get()
    
    if (!userDoc.exists) {
      return null
    }

    return { id: userDoc.id, ...userDoc.data() }
  } catch (error) {
    console.error('❌ Get user error:', error.message)
    throw error
  }
}

/**
 * Get user by email from Firestore
 */
export async function getUserByEmail(email) {
  const db = getFirestore()

  try {
    const snapshot = await db.collection(USERS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  } catch (error) {
    console.error('❌ Get user by email error:', error.message)
    throw error
  }
}

/**
 * Update user profile
 */
export async function updateUser(uid, updateData) {
  const auth = getAuth()
  const db = getFirestore()

  try {
    // Update Firebase Auth if email or password changed
    const authUpdate = {}
    if (updateData.email) authUpdate.email = updateData.email
    if (updateData.password) authUpdate.password = updateData.password
    if (updateData.displayName) authUpdate.displayName = updateData.displayName
    if (updateData.phoneNumber) authUpdate.phoneNumber = updateData.phoneNumber
    if (updateData.photoURL) authUpdate.photoURL = updateData.photoURL

    if (Object.keys(authUpdate).length > 0) {
      await auth.updateUser(uid, authUpdate)
    }

    // Update Firestore
    const { password, ...firestoreUpdate } = updateData
    firestoreUpdate.updatedAt = new Date().toISOString()

    await db.collection(USERS_COLLECTION).doc(uid).update(firestoreUpdate)

    const updatedUser = await getUserById(uid)
    console.log(`✅ User updated: ${uid}`)
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('❌ Update user error:', error.message)
    throw error
  }
}

/**
 * Delete user from Firebase Auth and Firestore
 */
export async function deleteUser(uid) {
  const auth = getAuth()
  const db = getFirestore()

  try {
    // Delete from Firebase Auth
    await auth.deleteUser(uid)
    
    // Delete from Firestore
    await db.collection(USERS_COLLECTION).doc(uid).delete()

    console.log(`✅ User deleted: ${uid}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Delete user error:', error.message)
    throw error
  }
}

/**
 * Verify Firebase ID Token
 */
export async function verifyToken(idToken) {
  const auth = getAuth()

  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    return { success: true, uid: decodedToken.uid, decoded: decodedToken }
  } catch (error) {
    console.error('❌ Token verification error:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(uid) {
  const db = getFirestore()

  try {
    await db.collection(USERS_COLLECTION).doc(uid).update({
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    console.error('❌ Update last login error:', error.message)
    throw error
  }
}

/**
 * Create custom token for user (for client-side auth)
 */
export async function createCustomToken(uid) {
  const auth = getAuth()

  try {
    const customToken = await auth.createCustomToken(uid)
    return { success: true, token: customToken }
  } catch (error) {
    console.error('❌ Create custom token error:', error.message)
    throw error
  }
}

/**
 * Update user profile after email verification
 * Completes the user profile with pending data
 */
export async function updateUserProfileAfterVerification(uid) {
  const db = getFirestore()
  const auth = getAuth()

  try {
    // Get current user document
    const userDoc = await db.collection(USERS_COLLECTION).doc(uid).get()
    
    if (!userDoc.exists) {
      throw new Error('User document not found')
    }

    const userData = userDoc.data()
    const userRecord = await auth.getUser(uid)

    // Complete the user profile with pending data
    const completeUserDoc = {
      ...userData,
      emailVerified: true,
      isActive: true,
      updatedAt: new Date().toISOString(),
      // Move pending data to main fields
      ...(userData._pendingData?.phoneNumber && {
        phoneNumber: userData._pendingData.phoneNumber
      }),
      ...(userData._pendingData?.photoURL && {
        photoURL: userData._pendingData.photoURL
      }),
    }

    // Remove pending data
    delete completeUserDoc._pendingData

    // Update Firestore
    await db.collection(USERS_COLLECTION).doc(uid).set(completeUserDoc, { merge: true })

    console.log(`✅ User profile completed after verification: ${userRecord.email}`)
    return { success: true, user: completeUserDoc }
  } catch (error) {
    console.error('❌ Update user profile after verification error:', error.message)
    throw error
  }
}

export default {
  createUser,
  createUserFromToken,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  verifyToken,
  updateLastLogin,
  createCustomToken,
  updateUserProfileAfterVerification
}

