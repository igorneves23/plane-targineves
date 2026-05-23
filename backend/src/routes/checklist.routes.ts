import { Router } from 'express'
import { createItem, updateItem, deleteItem } from '../controllers/checklist.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.post('/', createItem)
router.put('/:id', updateItem)
router.delete('/:id', deleteItem)

export default router
