import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

const columnSchema = z.object({
  boardId: z.string(),
  title: z.string().min(1),
  position: z.number().int().optional(),
})

export async function createColumn(req: AuthRequest, res: Response) {
  const parsed = columnSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { boardId, title, position } = parsed.data

  const count = await prisma.column.count({ where: { boardId } })
  const column = await prisma.column.create({
    data: { boardId, title, position: position ?? count },
  })
  res.status(201).json(column)
}

export async function updateColumn(req: AuthRequest, res: Response) {
  const schema = z.object({ title: z.string().min(1).optional(), position: z.number().int().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const column = await prisma.column.update({
    where: { id: req.params.id },
    data: parsed.data,
  })
  res.json(column)
}

export async function deleteColumn(req: AuthRequest, res: Response) {
  await prisma.column.delete({ where: { id: req.params.id } })
  res.status(204).send()
}

export async function reorderColumns(req: AuthRequest, res: Response) {
  const schema = z.array(z.object({ id: z.string(), position: z.number().int() }))
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  await prisma.$transaction(
    parsed.data.map((col) =>
      prisma.column.update({ where: { id: col.id }, data: { position: col.position } })
    )
  )
  res.json({ ok: true })
}
