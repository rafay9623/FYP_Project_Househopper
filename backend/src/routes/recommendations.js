import { Router } from 'express'
import * as recommendationsController from '../controllers/recommendations.js'
import { verifyToken } from '../middlewares/verify.js'
import { requirePlan } from '../middlewares/planAccess.js'

const router = Router()

/**
 * Recommendations Routes
 * Base path: /api/recommendations
 */

// Get recommendations for a specific property
router.get('/:propertyId', verifyToken, requirePlan('premium'), recommendationsController.getRecommendations)

// Health check for the recommendation service
router.get('/service/health', recommendationsController.getRecommendationHealth)

export default router
