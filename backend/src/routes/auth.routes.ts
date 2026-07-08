import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, register, me, forgotPassword, resetPassword } from '../controllers/auth.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const router = Router()

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/login', login)
router.get('/me', authenticate, me)
router.post('/register', authenticate, requireAdmin, register)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword)
router.post('/reset-password', forgotPasswordLimiter, resetPassword)

export default router
