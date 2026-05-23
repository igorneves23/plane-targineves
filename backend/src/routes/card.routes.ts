import { Router } from 'express'
import {
  createCard, getCard, updateCard, deleteCard, moveCard,
  addMember, removeMember, getActivities,
} from '../controllers/card.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.post('/', createCard)
router.get('/:id', getCard)
router.put('/:id', updateCard)
router.delete('/:id', deleteCard)
router.put('/:id/move', moveCard)
router.post('/:id/members', addMember)
router.delete('/:id/members/:userId', removeMember)
router.get('/:id/activities', getActivities)

export default router
