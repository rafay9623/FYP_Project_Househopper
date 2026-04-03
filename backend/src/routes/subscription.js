import { Router } from 'express'
import express from 'express'
import * as subscriptionController from '../controllers/subscription.js'
import { verifyToken } from '../middlewares/verify.js'

const router = Router()

/**
 * Subscription Routes
 * Base path: /api/subscription
 */

// Authenticated routes
router.get('/plan', verifyToken, subscriptionController.getUserPlan)
router.post('/checkout', verifyToken, subscriptionController.createCheckoutSession)
router.post('/verify-session', verifyToken, subscriptionController.verifySession)
router.post('/portal', verifyToken, subscriptionController.createCustomerPortalSession)

// Webhook route — uses raw body parser, NO auth
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook)

export default router
