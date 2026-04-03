import { Router } from 'express'
import * as propertyAuthController from '../controllers/propertyAuth.js'
import { verifyToken, verifyAdmin } from '../middlewares/verify.js'
import { requirePlan } from '../middlewares/planAccess.js'

const router = Router()

/**
 * Property Authentication Routes
 * Base path: /api/property-auth
 */

// User routes (requires Firebase auth)
router.post('/request/:propertyId', verifyToken, requirePlan('premium'), propertyAuthController.submitAuthRequest)
router.get('/my-requests', verifyToken, propertyAuthController.getMyAuthRequests)

// Admin routes (uses admin bypass token)
router.get('/admin/all', verifyAdmin, propertyAuthController.getAllAuthRequests)
router.put('/admin/review/:requestId', verifyAdmin, propertyAuthController.reviewAuthRequest)

export default router
