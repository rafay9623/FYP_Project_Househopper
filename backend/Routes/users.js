import { Router } from 'express'
import * as usersController from '../Controllers/users.js'
import { verifyToken } from '../Middlewares/verify.js'

const router = Router()

/**
 * Users Routes
 * Base path: /api/users
 */

// All routes require authentication
router.use(verifyToken)

// Get all users (for browsing)
router.get('/', usersController.getAllUsers)

// Get user by ID
router.get('/:userId', usersController.getUserById)

export default router

