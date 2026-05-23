import { Router } from 'express'
import { listUsers, createUser, updateUser, deleteUser, updateProfile } from '../controllers/user.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.get('/', listUsers)
router.post('/', requireAdmin, createUser)
router.put('/:id', requireAdmin, updateUser)
router.delete('/:id', requireAdmin, deleteUser)
router.put('/profile', updateProfile)

export default router
