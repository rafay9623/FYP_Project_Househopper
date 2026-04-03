import { getFirestore } from '../config/firebase_config.js'

const USERS_COLLECTION = 'users'

// Plan hierarchy for comparison
const PLAN_LEVELS = {
  basic: 0,
  intermediate: 1,
  premium: 2,
}

/**
 * Middleware factory to restrict access based on user's subscription plan.
 *
 * Usage:
 *   router.get('/roi', verifyToken, requirePlan('intermediate'), controller)
 *   router.get('/recommendations', verifyToken, requirePlan('premium'), controller)
 *
 * The admin bypass token always gets full access.
 */
export function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      // Admin bypass — always has full access
      if (req.user?.role === 'admin' || req.user?.uid === 'admin-uid') {
        return next()
      }

      const userId = req.user?.uid
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        })
      }

      const db = getFirestore()
      const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get()

      let userPlan = 'basic'
      if (userDoc.exists) {
        const data = userDoc.data()
        userPlan = data.subscriptionPlan || 'basic'

        // Check if subscription is still active (not canceled/past_due)
        if (data.subscriptionStatus === 'canceled' || data.subscriptionStatus === 'past_due') {
          userPlan = 'basic'
        }
      }

      const userLevel = PLAN_LEVELS[userPlan] ?? 0
      const requiredLevel = PLAN_LEVELS[minPlan] ?? 0

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: `This feature requires the ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan or higher.`,
          requiredPlan: minPlan,
          currentPlan: userPlan,
          upgradeUrl: '/pricing',
        })
      }

      // Attach plan to request for downstream use
      req.userPlan = userPlan
      next()
    } catch (error) {
      console.error('Plan access check error:', error)
      res.status(500).json({ success: false, error: 'Failed to verify subscription plan' })
    }
  }
}
