import { Router } from 'express'
import { createComment, deleteComment } from '../controllers/comment.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.post('/', createComment)
router.delete('/:id', deleteComment)

export default router
