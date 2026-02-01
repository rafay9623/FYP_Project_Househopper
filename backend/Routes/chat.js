import { Router } from 'express'
import * as chatController from '../Controllers/chat.js'
import { verifyToken } from '../Middlewares/verify.js'

const router = Router()

router.post('/message', verifyToken, chatController.handleMessage)

export default router
