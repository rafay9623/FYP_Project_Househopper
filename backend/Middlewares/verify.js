import { getAuth } from '../Configs/firebase_config.js'

/**
 * Verify Firebase ID Token Middleware
 * Extracts and verifies the Bearer token from Authorization header
 */
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      })
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format. Use: Bearer <token>'
      })
    }

    const idToken = authHeader.split('Bearer ')[1]

    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      })
    }

    // Verify the token with Firebase Admin
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(idToken)

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture
    }

    console.log(`✅ Token verified for user: ${decodedToken.email || decodedToken.uid}`)
    next()
  } catch (error) {
    console.error('❌ Token verification failed:', error.message)

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please login again.'
      })
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked. Please login again.'
      })
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      })
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    })
  }
}

/**
 * Optional Auth Middleware
 * Verifies token if present, but doesn't block if missing
 * Useful for routes that work differently for authenticated/anonymous users
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null
      return next()
    }

    const idToken = authHeader.split('Bearer ')[1]

    if (!idToken) {
      req.user = null
      return next()
    }

    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(idToken)

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture
    }

    next()
  } catch (error) {
    // Token invalid, but continue without user
    req.user = null
    next()
  }
}

/**
 * Role-based Authorization Middleware
 * Use after verifyToken to check user roles
 */
export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Get user from Firestore to check role
      const { getFirestore } = await import('../Configs/firebase_config.js')
      const db = getFirestore()
      const userDoc = await db.collection('users').doc(req.user.uid).get()

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      const userData = userDoc.data()
      const userRole = userData.role || 'user'

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        })
      }

      req.userRole = userRole
      next()
    } catch (error) {
      console.error('❌ Role check failed:', error.message)
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      })
    }
  }
}

export default {
  verifyToken,
  optionalAuth,
  requireRole
}

