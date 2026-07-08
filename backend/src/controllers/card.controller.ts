import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

const cardSchema = z.object({
  columnId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  recurring: z.boolean().optional(),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional().nullable(),
  nextExecution: z.string().datetime().optional().nullable(),
})

const cardInclude = {
  members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
  labels: { include: { label: true } },
  checklist: {
    orderBy: { position: 'asc' as const },
    include: {
      completedBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
    },
  },
  comments: {
    orderBy: { createdAt: 'desc' as const },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  },
  attachments: true,
  createdBy: { select: { id: true, name: true, avatar: true } },
}

export async function createCard(req: AuthRequest, res: Response) {
  const parsed = cardSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const count = await prisma.card.count({ where: { columnId: parsed.data.columnId } })

  const card = await prisma.card.create({
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      position: count,
      createdById: req.userId!,
    },
    include: cardInclude,
  })

  await prisma.activity.create({
    data: { cardId: card.id, userId: req.userId!, action: `criou o cartão "${card.title}"` },
  })

  res.status(201).json(card)
}

export async function getCard(req: AuthRequest, res: Response) {
  const card = await prisma.card.findUnique({
    where: { id: req.params.id },
    include: cardInclude,
  })
  if (!card) {
    res.status(404).json({ error: 'Cartão não encontrado' })
    return
  }
  res.json(card)
}

export async function updateCard(req: AuthRequest, res: Response) {
  const schema = cardSchema.partial().extend({
    columnId: z.string().optional(),
    position: z.number().int().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const card = await prisma.card.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : parsed.data.dueDate,
      nextExecution: parsed.data.nextExecution ? new Date(parsed.data.nextExecution) : parsed.data.nextExecution,
    },
    include: cardInclude,
  })

  await prisma.activity.create({
    data: { cardId: card.id, userId: req.userId!, action: `atualizou o cartão "${card.title}"` },
  })

  res.json(card)
}

export async function deleteCard(req: AuthRequest, res: Response) {
  await prisma.card.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

export async function moveCard(req: AuthRequest, res: Response) {
  const schema = z.object({
    columnId: z.string(),
    position: z.number().int(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const card = await prisma.card.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: cardInclude,
  })

  await prisma.activity.create({
    data: { cardId: card.id, userId: req.userId!, action: `moveu o cartão "${card.title}"` },
  })

  res.json(card)
}

export async function addMember(req: AuthRequest, res: Response) {
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ error: 'userId obrigatório' })
    return
  }

  await prisma.cardMember.upsert({
    where: { cardId_userId: { cardId: req.params.id, userId } },
    update: {},
    create: { cardId: req.params.id, userId },
  })
  res.json({ ok: true })
}

export async function removeMember(req: AuthRequest, res: Response) {
  await prisma.cardMember.deleteMany({
    where: { cardId: req.params.id, userId: req.params.userId },
  })
  res.status(204).send()
}

export async function getActivities(req: AuthRequest, res: Response) {
  const activities = await prisma.activity.findMany({
    where: { cardId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  res.json(activities)
}
