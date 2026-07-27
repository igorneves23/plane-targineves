import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'
import { getVisitingCards } from '../lib/visitingCards'

const boardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  responsibleId: z.string().optional().nullable(),
  columnOrder: z.array(z.string()).optional(),
})

export async function listBoards(req: AuthRequest, res: Response) {
  const boards = await prisma.board.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      responsible: { select: { id: true, name: true, avatar: true } },
      _count: { select: { columns: true } },
    },
  })

  // Resumo dos cartões por quadro pro Dashboard (total, concluídos, atrasados
  // e os de hoje). Uma consulta enxuta só com os campos de data/status — o
  // volume aqui é pequeno, então agrupar em memória sai mais simples que
  // montar quatro agregações separadas no banco.
  const cards = await prisma.card.findMany({
    select: {
      status: true,
      dueDate: true,
      recurring: true,
      nextExecution: true,
      column: { select: { boardId: true } },
    },
  })

  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const statsByBoard = new Map<string, { total: number; done: number; overdue: number; today: number }>()
  for (const card of cards) {
    const boardId = card.column.boardId
    const stats = statsByBoard.get(boardId) ?? { total: 0, done: 0, overdue: 0, today: 0 }
    stats.total++

    if (card.status === 'DONE') {
      stats.done++
    } else {
      const reference = card.recurring ? card.nextExecution : card.dueDate
      if (reference) {
        if (reference < now) stats.overdue++
        else if (reference <= endOfToday) stats.today++
      }
    }
    statsByBoard.set(boardId, stats)
  }

  const empty = { total: 0, done: 0, overdue: 0, today: 0 }
  res.json(boards.map((board) => ({ ...board, cardStats: statsByBoard.get(board.id) ?? empty })))
}

export async function createBoard(req: AuthRequest, res: Response) {
  const parsed = boardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const board = await prisma.board.create({
    data: { ...parsed.data, createdById: req.userId! },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      responsible: { select: { id: true, name: true, avatar: true } },
    },
  })
  res.status(201).json(board)
}

export async function getBoard(req: AuthRequest, res: Response) {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      responsible: { select: { id: true, name: true, avatar: true } },
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              labels: { include: { label: true } },
              createdBy: { select: { id: true, role: true } },
              _count: { select: { checklist: true, comments: true } },
            },
          },
        },
      },
    },
  })

  if (!board) {
    res.status(404).json({ error: 'Quadro não encontrado' })
    return
  }

  const visitingCards = board.responsibleId ? await getVisitingCards(board.responsibleId, board.id) : []

  res.json({ ...board, visitingCards })
}

export async function updateBoard(req: AuthRequest, res: Response) {
  const parsed = boardSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const board = await prisma.board.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      responsible: { select: { id: true, name: true, avatar: true } },
    },
  })
  res.json(board)
}

export async function deleteBoard(req: AuthRequest, res: Response) {
  await prisma.board.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
