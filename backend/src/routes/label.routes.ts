import { Router } from 'express'
import { listLabels, createLabel, updateLabel, deleteLabel, addLabelToCard, removeLabelFromCard } from '../controllers/label.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.get('/', listLabels)
router.post('/', createLabel)
router.put('/:id', updateLabel)
router.delete('/:id', deleteLabel)
router.post('/card/:cardId', addLabelToCard)
router.delete('/card/:cardId/:labelId', removeLabelFromCard)

export default router
