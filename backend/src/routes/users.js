import { Router } from 'express'
import * as usersController from '../controllers/users.js'
import { verifyToken, verifyAdmin } from '../middlewares/verify.js'

const router = Router()

/**
 * Users Routes
 * Base path: /api/users
 */

// Admin route (must be before /:userId to avoid matching 'admin' as userId)
router.get('/admin/all', verifyAdmin, usersController.getAdminAllUsers)

// All routes below require authentication
router.use(verifyToken)

// Get all users (for browsing)
router.get('/', usersController.getAllUsers)

// Get user by ID
router.get('/:userId', usersController.getUserById)

export default router


