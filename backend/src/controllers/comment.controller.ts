import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

export async function createComment(req: AuthRequest, res: Response) {
  const schema = z.object({ cardId: z.string(), content: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const comment = await prisma.comment.create({
    data: { ...parsed.data, userId: req.userId! },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })

  await prisma.activity.create({
    data: { cardId: parsed.data.cardId, userId: req.userId!, action: 'adicionou um comentário' },
  })

  res.status(201).json(comment)
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } })
  if (!comment) {
    res.status(404).json({ error: 'Comentário não encontrado' })
    return
  }

  if (comment.userId !== req.userId && req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Sem permissão' })
    return
  }

  await prisma.comment.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
