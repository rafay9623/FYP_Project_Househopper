import { signup } from './signup.js'
import { login } from './login.js'
import { getProfile, updateProfile, deleteAccount } from './profile.js'
import { verifyEmail, verifyToken } from './verify.js'
import { getAuth, getFirestore } from '../../config/firebase_config.js'

export async function logout(req, res) {
  try {
    res.clearCookie('token')
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ success: false, error: 'Logout failed' })
  }
}

export async function testFirestore(req, res) {
  try {
    const db = getFirestore()
    const auth = getAuth()
    if (!db) return res.status(500).json({ success: false, error: 'Firestore is not initialized' })
    
    await db.collection('users').doc('test').set({ test: true })
    const verifyDoc = await db.collection('users').doc('test').get()
    
    if (verifyDoc.exists) {
      await db.collection('users').doc('test').delete()
      return res.json({ success: true, message: 'Firestore working', firestoreInitialized: true, authInitialized: !!auth })
    }
    return res.status(500).json({ success: false, error: 'Failed to verify Firestore write' })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
}

export async function testUserData(req, res) {
  try {
    const { uid, email } = req.user
    if (!uid) return res.status(401).json({ success: false, error: 'Authentication required' })

    const db = getFirestore()
    const userDoc = await db.collection('users').doc(uid).get()
    
    return res.json({
      success: true,
      test: {
        authenticatedUser: { uid, email },
        firestoreUser: { exists: userDoc.exists }
      }
    })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
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
