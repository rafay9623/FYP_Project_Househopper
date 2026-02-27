import { Router } from 'express'
import * as propertiesController from '../Controllers/properties.js'
import { verifyToken } from '../Middlewares/verify.js'

const router = Router()

/**
 * Properties Routes
 * Base path: /api/properties
 */

// Public route for heat map (no auth required)
router.get('/all-locations', propertiesController.getAllPropertyLocations)

// Authenticated routes
router.get('/', verifyToken, propertiesController.getAllProperties)
router.get('/user/:userId', verifyToken, propertiesController.getPropertiesByUserId)
router.get('/:id', verifyToken, propertiesController.getPropertyById)
router.post('/', verifyToken, propertiesController.createProperty)
router.put('/:id', verifyToken, propertiesController.updateProperty)
router.delete('/:id', verifyToken, propertiesController.deleteProperty)

export default router

