import { Router } from 'express'
import * as chatController from '../controllers/chat.js'
import { verifyToken } from '../middlewares/verify.js'

const router = Router()

router.post('/message', verifyToken, chatController.handleMessage)

export default router
