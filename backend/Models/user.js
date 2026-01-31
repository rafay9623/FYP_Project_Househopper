/**
 * User Model Schema
 * Defines the structure for user documents in Firestore
 */

export const UserSchema = {
  uid: '',           // Firebase Auth UID
  email: '',         // User email
  displayName: '',   // Display name
  firstName: '',     // First name
  lastName: '',      // Last name
  photoURL: '',      // Profile photo URL
  phoneNumber: '',   // Phone number
  role: 'user',      // Role: 'user' | 'admin'
  isActive: true,    // Account status
  createdAt: null,   // Timestamp
  updatedAt: null,   // Timestamp
  lastLoginAt: null, // Last login timestamp
}

/**
 * Create a new user object with defaults
 */
export function createUserObject(data) {
  return {
    uid: data.uid || '',
    email: data.email || '',
    displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    photoURL: data.photoURL || '',
    phoneNumber: data.phoneNumber || '',
    role: data.role || 'user',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: data.lastLoginAt || null,
  }
}

/**
 * Validate user data for signup
 */
export function validateSignupData(data) {
  const errors = []

  if (!data.email) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }

  if (!data.password) {
    errors.push('Password is required')
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize user data for response (remove sensitive fields)
 */
export function sanitizeUserForResponse(user) {
  const { password, ...safeUser } = user
  return safeUser
}

export default {
  UserSchema,
  createUserObject,
  validateSignupData,
  sanitizeUserForResponse
}

