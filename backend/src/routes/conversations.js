import { Router } from 'express'
import * as conversationsController from '../controllers/conversations.js'
import { verifyToken, verifyAdmin } from '../middlewares/verify.js'

const router = Router()

// All admin routes (must use verifyAdmin)
router.get('/admin/all', verifyAdmin, conversationsController.getAdminAllConversations)

// All user-facing routes require authentication
router.use(verifyToken)

router.post('/', conversationsController.createConversation)
router.get('/', conversationsController.getAllConversations)
router.get('/:id/messages', conversationsController.getConversationMessages)
router.delete('/:id', conversationsController.deleteConversation)

export default router

