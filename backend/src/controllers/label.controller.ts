import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

export async function listLabels(_req: AuthRequest, res: Response) {
  const labels = await prisma.label.findMany({ orderBy: { name: 'asc' } })
  res.json(labels)
}

export async function createLabel(req: AuthRequest, res: Response) {
  const schema = z.object({ name: z.string().min(1), color: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const label = await prisma.label.create({ data: parsed.data })
  res.status(201).json(label)
}

export async function updateLabel(req: AuthRequest, res: Response) {
  const schema = z.object({ name: z.string().min(1).optional(), color: z.string().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const label = await prisma.label.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(label)
}

export async function deleteLabel(req: AuthRequest, res: Response) {
  await prisma.label.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

export async function addLabelToCard(req: AuthRequest, res: Response) {
  const schema = z.object({ labelId: z.string() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  await prisma.cardLabel.upsert({
    where: { cardId_labelId: { cardId: req.params.cardId, labelId: parsed.data.labelId } },
    update: {},
    create: { cardId: req.params.cardId, labelId: parsed.data.labelId },
  })
  res.json({ ok: true })
}

export async function removeLabelFromCard(req: AuthRequest, res: Response) {
  await prisma.cardLabel.deleteMany({
    where: { cardId: req.params.cardId, labelId: req.params.labelId },
  })
  res.status(204).send()
}
