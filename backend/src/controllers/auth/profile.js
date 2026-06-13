import * as authService from '../../services/auth.js'
import { sanitizeUserForResponse } from '../../models/user.js'
import { ensureFirestoreProfile } from '../../services/auth.js'

export async function getProfile(req, res) {
  try {
    const { uid, email } = req.user
    
    console.log(`🔍 Fetching profile for user: ${uid} (${email})`)

    let user = await authService.getUserById(uid)
    
    if (!user) {
      console.log(`⚠️ User ${uid} not found in Firestore, creating profile...`)
      try {
        const userDoc = await ensureFirestoreProfile(uid)
        user = { id: uid, ...userDoc }
      } catch (createError) {
        console.error('Error creating user profile:', createError)
        return res.status(500).json({ success: false, error: 'Failed to create user profile' })
      }
    }

    if (user.uid !== uid && user.id !== uid) {
      console.error(`❌ User ID mismatch! Requested: ${uid}, Found: ${user.uid || user.id}`)
      return res.status(403).json({ success: false, error: 'Access denied - user ID mismatch' })
    }

    res.json({ success: true, user: sanitizeUserForResponse(user) })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ success: false, error: 'Failed to get profile' })
  }
}

export async function updateProfile(req, res) {
  try {
    const { uid } = req.user
    const updateData = req.body

    const allowedFields = ['firstName', 'lastName', 'displayName', 'phoneNumber', 'photoURL', 'bio']
    const safeUpdateData = {}

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        safeUpdateData[field] = updateData[field]
      }
    }

    safeUpdateData.updatedAt = new Date().toISOString()

    const result = await authService.updateUser(uid, safeUpdateData)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUserForResponse(result.user)
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
}

export async function deleteAccount(req, res) {
  try {
    const { uid } = req.user
    await authService.deleteUser(uid)
    res.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ success: false, error: 'Failed to delete account' })
  }
}
