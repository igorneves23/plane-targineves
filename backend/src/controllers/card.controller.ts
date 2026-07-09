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
  durationMinutes: z.number().int().min(5).max(24 * 60).optional().nullable(),
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

export async function listWeeklyCards(_req: AuthRequest, res: Response) {
  const cards = await prisma.card.findMany({
    where: {
      OR: [
        { recurring: true, nextExecution: { not: null } },
        { dueDate: { not: null } },
      ],
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      labels: { include: { label: true } },
      column: { include: { board: { select: { id: true, title: true, color: true } } } },
      _count: { select: { checklist: true, comments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const result = cards
    .map((card) => {
      const referenceDate = card.recurring ? card.nextExecution ?? card.dueDate : card.dueDate
      if (!referenceDate) return null
      const { column, ...rest } = card
      return {
        ...rest,
        referenceDate,
        weekday: referenceDate.getDay(),
        board: column.board,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  res.json(result)
}

// Fator de conversão da duração de uma tarefa recorrente para uma
// carga semanal equivalente (ex: uma tarefa diária de 30min conta 3h30/semana)
const WEEKLY_FACTOR: Record<string, number> = {
  DAILY: 7,
  WEEKLY: 1,
  MONTHLY: 7 / 30,
  YEARLY: 7 / 365,
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(d)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(d.getDate() + diff)
  return monday
}

export async function listWorkload(_req: AuthRequest, res: Response) {
  const cards = await prisma.card.findMany({
    where: { status: { not: 'DONE' } },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      column: { include: { board: { select: { id: true, title: true, color: true } } } },
    },
  })

  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const perUser = new Map<string, {
    user: { id: string; name: string; avatar: string | null }
    minutes: number
    cards: { id: string; title: string; minutes: number; boardTitle: string; boardColor: string }[]
  }>()

  for (const card of cards) {
    if (card.members.length === 0) continue
    const duration = card.durationMinutes ?? 60

    let weeklyMinutes = 0
    if (card.recurring && card.recurringType) {
      weeklyMinutes = duration * (WEEKLY_FACTOR[card.recurringType] ?? 1)
    } else if (card.dueDate && card.dueDate >= weekStart && card.dueDate < weekEnd) {
      weeklyMinutes = duration
    }

    if (weeklyMinutes <= 0) continue

    for (const member of card.members) {
      if (!perUser.has(member.userId)) {
        perUser.set(member.userId, { user: member.user, minutes: 0, cards: [] })
      }
      const entry = perUser.get(member.userId)!
      entry.minutes += weeklyMinutes
      entry.cards.push({
        id: card.id,
        title: card.title,
        minutes: weeklyMinutes,
        boardTitle: card.column.board.title,
        boardColor: card.column.board.color,
      })
    }
  }

  const result = [...perUser.values()].sort((a, b) => b.minutes - a.minutes)
  res.json(result)
}

export async function getActivities(req: AuthRequest, res: Response) {
  const activities = await prisma.activity.findMany({
    where: { cardId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  res.json(activities)
}
