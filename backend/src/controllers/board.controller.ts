import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

const boardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
})

export async function listBoards(req: AuthRequest, res: Response) {
  const boards = await prisma.board.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      _count: { select: { columns: true } },
    },
  })
  res.json(boards)
}

export async function createBoard(req: AuthRequest, res: Response) {
  const parsed = boardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const board = await prisma.board.create({
    data: { ...parsed.data, createdById: req.userId! },
    include: { createdBy: { select: { id: true, name: true, avatar: true } } },
  })
  res.status(201).json(board)
}

export async function getBoard(req: AuthRequest, res: Response) {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              labels: { include: { label: true } },
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
  res.json(board)
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
  })
  res.json(board)
}

export async function deleteBoard(req: AuthRequest, res: Response) {
  await prisma.board.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
