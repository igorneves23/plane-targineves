import { Router } from 'express'
import { uploadAttachment, deleteAttachment } from '../controllers/attachment.controller'
import { authenticate } from '../middlewares/auth'
import { upload } from '../middlewares/upload'

const router = Router()

router.use(authenticate)
router.post('/', upload.single('file'), uploadAttachment)
router.delete('/:id', deleteAttachment)

export default router
