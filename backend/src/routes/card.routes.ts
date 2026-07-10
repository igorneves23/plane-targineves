import { Router } from 'express'
import {
  createCard, getCard, updateCard, deleteCard, moveCard,
  addMember, removeMember, getActivities, listWeeklyCards,
  listWorkload, listWorkloadMonthly, listWorkloadYearly, listPerformance,
} from '../controllers/card.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.post('/', createCard)
router.get('/weekly', listWeeklyCards)
router.get('/workload', requireAdmin, listWorkload)
router.get('/workload/monthly', requireAdmin, listWorkloadMonthly)
router.get('/workload/yearly', requireAdmin, listWorkloadYearly)
router.get('/performance', requireAdmin, listPerformance)
router.get('/:id', getCard)
router.put('/:id', updateCard)
router.delete('/:id', deleteCard)
router.put('/:id/move', moveCard)
router.post('/:id/members', addMember)
router.delete('/:id/members/:userId', removeMember)
router.get('/:id/activities', getActivities)

export default router
