import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

export async function createItem(req: AuthRequest, res: Response) {
  const schema = z.object({ cardId: z.string(), title: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const count = await prisma.checklistItem.count({ where: { cardId: parsed.data.cardId } })
  const item = await prisma.checklistItem.create({
    data: { ...parsed.data, position: count },
  })
  res.status(201).json(item)
}

export async function updateItem(req: AuthRequest, res: Response) {
  const schema = z.object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
    position: z.number().int().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { completed, ...rest } = parsed.data
  const data: typeof rest & { completed?: boolean; completedById?: string | null; completedAt?: Date | null } = { ...rest }
  if (completed !== undefined) {
    data.completed = completed
    data.completedById = completed ? req.userId : null
    data.completedAt = completed ? new Date() : null
  }

  const item = await prisma.checklistItem.update({
    where: { id: req.params.id },
    data,
    include: { completedBy: { select: { id: true, name: true } } },
  })
  res.json(item)
}

export async function deleteItem(req: AuthRequest, res: Response) {
  await prisma.checklistItem.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
