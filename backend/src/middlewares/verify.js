import { getAuth } from '../config/firebase_config.js'

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

    // Admin bypass — matches the hardcoded token from the frontend admin session
    if (idToken === 'admin-token') {
      req.user = {
        uid: 'admin-uid',
        email: 'youngdumbrokedie@gmail.com',
        emailVerified: true,
        name: 'System Admin',
        role: 'admin'
      }
      console.log('✅ Admin token bypass — admin user attached')
      return next()
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
      const { getFirestore } = await import('../config/firebase_config.js')
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

/**
 * Admin Bypass Middleware
 * Verifies the hardcoded admin token used by the frontend admin session.
 * The admin account is not a real Firebase Auth user, so verifyToken would fail.
 */
export function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      })
    }

    const token = authHeader.split('Bearer ')[1]

    if (token === 'admin-token') {
      req.user = {
        uid: 'admin-uid',
        email: 'youngdumbrokedie@gmail.com',
        role: 'admin'
      }
      console.log('✅ Admin token verified')
      return next()
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden — admin access required'
    })
  } catch (error) {
    console.error('❌ Admin verification failed:', error.message)
    return res.status(500).json({
      success: false,
      error: 'Admin authorization check failed'
    })
  }
}

export default {
  verifyToken,
  optionalAuth,
  requireRole,
  verifyAdmin
}

