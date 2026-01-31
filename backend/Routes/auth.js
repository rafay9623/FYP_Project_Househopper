import { Router } from 'express'
import * as authController from '../Controllers/auth.js'
import { verifyToken } from '../Middlewares/verify.js'

const router = Router()

/**
 * Auth Routes
 * Base path: /api/auth
 */

// Public routes (no authentication required)
router.post('/signup', authController.signup)
router.post('/verify-email', authController.verifyEmail)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/verify-token', authController.verifyToken)
router.get('/test-firestore', authController.testFirestore)
router.get('/test-user-data', verifyToken, authController.testUserData)

// Protected routes (authentication required)
router.get('/profile', verifyToken, authController.getProfile)
router.put('/profile', verifyToken, authController.updateProfile)
router.delete('/account', verifyToken, authController.deleteAccount)

export default router

