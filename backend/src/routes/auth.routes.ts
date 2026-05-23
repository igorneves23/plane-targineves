import { Router } from 'express'
import { login, register, me } from '../controllers/auth.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const router = Router()

router.post('/login', login)
router.get('/me', authenticate, me)
router.post('/register', authenticate, requireAdmin, register)

export default router
