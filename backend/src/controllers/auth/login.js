import * as authService from '../../services/auth.js'
import { sanitizeUserForResponse } from '../../models/user.js'
import { ensureFirestoreProfile } from '../../services/auth.js'

export async function login(req, res) {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token is required' })
    }

    const tokenResult = await authService.verifyToken(idToken)
    
    if (!tokenResult.success) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }

    let user = await authService.getUserById(tokenResult.uid)
    
    if (!user) {
      console.log(`⚠️ User ${tokenResult.uid} not found in Firestore, creating profile...`)
      try {
        const userDoc = await ensureFirestoreProfile(tokenResult.uid)
        user = { id: tokenResult.uid, ...userDoc }
      } catch (createError) {
        console.error('Error creating user profile:', createError)
        return res.status(500).json({ success: false, error: 'Failed to create user profile' })
      }
    }

    await authService.updateLastLogin(tokenResult.uid)

    res.json({
      success: true,
      message: 'Login successful',
      user: sanitizeUserForResponse(user)
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Login failed' })
  }
}
