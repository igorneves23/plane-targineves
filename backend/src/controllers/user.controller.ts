import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: { name: 'asc' },
  })
  res.json(users)
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const schema = z.object({
    name: z.string().min(2).optional(),
    avatar: z.string().url().optional().nullable(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, avatar: true },
  })
  res.json(user)
}
