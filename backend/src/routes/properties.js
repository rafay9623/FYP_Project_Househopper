import { Router } from 'express'
import * as propertiesController from '../controllers/properties.js'
import { verifyToken, verifyAdmin } from '../middlewares/verify.js'

const router = Router()

/**
 * Properties Routes
 * Base path: /api/properties
 */

// Public route for heat map (no auth required)
router.get('/all-locations', propertiesController.getAllPropertyLocations)

// Admin-only routes
router.get('/admin/stats', verifyAdmin, propertiesController.getAdminStats)
router.get('/admin/all', verifyAdmin, propertiesController.getAdminAllProperties)


// Authenticated routes
router.get('/stats', verifyToken, propertiesController.getPropertyStats)
router.get('/', verifyToken, propertiesController.getAllProperties)

router.get('/user/:userId', verifyToken, propertiesController.getPropertiesByUserId)
router.get('/:id', verifyToken, propertiesController.getPropertyById)
router.post('/', verifyToken, propertiesController.createProperty)
router.put('/:id', verifyToken, propertiesController.updateProperty)
router.delete('/:id', verifyToken, propertiesController.deleteProperty)

export default router

