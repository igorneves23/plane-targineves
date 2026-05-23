import { Router } from 'express'
import { listBoards, createBoard, getBoard, updateBoard, deleteBoard } from '../controllers/board.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.use(authenticate)
router.get('/', listBoards)
router.post('/', createBoard)
router.get('/:id', getBoard)
router.put('/:id', updateBoard)
router.delete('/:id', deleteBoard)

export default router
