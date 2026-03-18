import { Router } from 'express'
import * as recommendationsController from '../Controllers/recommendations.js'
import { verifyToken } from '../Middlewares/verify.js'

const router = Router()

/**
 * Recommendations Routes
 * Base path: /api/recommendations
 */

// Get recommendations for a specific property
router.get('/:propertyId', verifyToken, recommendationsController.getRecommendations)

// Health check for the recommendation service
router.get('/service/health', recommendationsController.getRecommendationHealth)

export default router
