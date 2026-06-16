import * as authService from '../../services/auth.js'
import { sanitizeUserForResponse } from '../../models/user.js'
import { getAuth, getFirestore } from '../../config/firebase_config.js'

export async function verifyEmail(req, res) {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token is required' })
    }

    const auth = getAuth()
    const db = getFirestore()

    try {
      const decodedToken = await auth.verifyIdToken(idToken)
      const uid = decodedToken.uid

      let emailVerified = false
      let userEmail = decodedToken.email || ''
      let displayName = ''
      let phoneNumber = ''

      try {
        const userRecord = await auth.getUser(uid)
        emailVerified = userRecord.emailVerified
        userEmail = userRecord.email || userEmail
        displayName = userRecord.displayName || ''
        phoneNumber = userRecord.phoneNumber || ''
      } catch (getUserError) {
        console.warn('⚠️ Failed to fetch userRecord during verifyEmail, falling back to ID token:', getUserError.message)
        emailVerified = decodedToken.email_verified || false
      }

      if (!emailVerified) {
        return res.status(400).json({ success: false, error: 'Email is not verified yet. Please verify your email first.' })
      }

      const userDocRef = db.collection('users').doc(uid)
      const userDoc = await userDocRef.get()
      
      let user
      if (!userDoc.exists) {
        console.log(`⚠️ User document not found for ${uid}, creating profile...`)
        const newUserDoc = {
          uid: uid,
          email: userEmail,
          emailVerified: true,
          firstName: displayName.split(' ')[0] || '',
          lastName: displayName.split(' ').slice(1).join(' ') || '',
          displayName: displayName,
          role: 'user',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(phoneNumber && { phoneNumber: phoneNumber })
        }
        await userDocRef.set(newUserDoc)
        user = newUserDoc
      } else {
        await userDocRef.update({
          emailVerified: true,
          isActive: true,
          updatedAt: new Date().toISOString()
        })
        const updatedDoc = await userDocRef.get()
        user = updatedDoc.data()
      }

      console.log(`✅ Email verified and profile activated for user: ${userEmail}`)

      res.status(200).json({
        success: true,
        message: 'Email verified successfully! Your account is now active.',
        user: sanitizeUserForResponse(user)
      })
    } catch (tokenError) {
      console.error('Token verification error:', tokenError.message)
      return res.status(401).json({ success: false, error: 'Invalid or expired token. Please sign in again.' })
    }
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ success: false, error: error.message || 'Failed to verify email' })
  }
}

export async function verifyToken(req, res) {
  try {
    const { idToken } = req.body

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token is required' })
    }

    const result = await authService.verifyToken(idToken)
    
    if (!result.success) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }

    res.json({ success: true, uid: result.uid })
  } catch (error) {
    console.error('Verify token error:', error)
    res.status(500).json({ success: false, error: 'Token verification failed' })
  }
}
