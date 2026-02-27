import { Router } from 'express'
import * as conversationsController from '../Controllers/conversations.js'
import { verifyToken } from '../Middlewares/verify.js'

const router = Router()

// All routes require authentication
router.use(verifyToken)

router.post('/', conversationsController.createConversation)
router.get('/', conversationsController.getAllConversations)
router.get('/:id/messages', conversationsController.getConversationMessages)
router.delete('/:id', conversationsController.deleteConversation)

export default router
