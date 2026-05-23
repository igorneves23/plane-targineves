import { Router } from 'express'
import { listUsers, updateProfile } from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.get('/', listUsers)
router.put('/profile', updateProfile)

export default router
