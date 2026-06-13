import { getFirestore, getAuth } from '../config/firebase_config.js'
import { createUserObject } from '../models/user.js'

/**
 * Ensures a user profile exists in Firestore. 
 * Creates a new profile or merges updates into an existing one.
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} overrides - Additional user fields (e.g., firstName, lastName)
 * @returns {Promise<object>} The merged user profile from Firestore
 */
export async function ensureFirestoreProfile(uid, overrides = {}) {
  const db = getFirestore()
  const auth = getAuth()
  
  // Fetch user from Firebase Auth
  const userRecord = await auth.getUser(uid)
  const ref = db.collection('users').doc(uid)
  const existing = await ref.get()

  // Extract names from Auth displayName if not provided in overrides
  const authFirstName = userRecord.displayName?.split(' ')[0] || ''
  const authLastName = userRecord.displayName?.split(' ').slice(1).join(' ') || ''

  const profile = createUserObject({
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName || `${overrides.firstName || authFirstName} ${overrides.lastName || authLastName}`.trim(),
    firstName: overrides.firstName || authFirstName,
    lastName: overrides.lastName || authLastName,
    isActive: userRecord.emailVerified,
    ...overrides,
  })

  if (existing.exists) {
    // Preserve existing creation date
    profile.createdAt = existing.data().createdAt
    // Add lastLoginAt
    profile.lastLoginAt = new Date().toISOString()
    
    // Merge new data over existing data (except sensitive stuff that shouldn't be overridden)
    const dataToMerge = {
      ...existing.data(),
      ...profile,
      updatedAt: new Date().toISOString()
    }
    
    await ref.set(dataToMerge, { merge: true })
    return (await ref.get()).data()
  } else {
    // Create new profile
    profile.createdAt = new Date().toISOString()
    profile.lastLoginAt = profile.createdAt
    await ref.set(profile)
    return profile
  }
}
