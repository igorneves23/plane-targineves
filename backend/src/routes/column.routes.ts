import { Router } from 'express'
import { createColumn, updateColumn, deleteColumn, reorderColumns } from '../controllers/column.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.post('/', createColumn)
router.put('/reorder', reorderColumns)
router.put('/:id', updateColumn)
router.delete('/:id', deleteColumn)

export default router
