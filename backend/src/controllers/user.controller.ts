import { Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  res.json(users)
}

export async function createUser(req: AuthRequest, res: Response) {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'LEADER', 'MEMBER']).default('MEMBER'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (exists) {
      res.status(409).json({ error: 'Email já cadastrado' })
      return
    }
    const hash = await bcrypt.hash(parsed.data.password, 10)
    const user = await prisma.user.create({
      data: { ...parsed.data, password: hash },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    })
    res.status(201).json(user)
  } catch (err: any) {
    console.error('[createUser error]', err)
    res.status(500).json({ error: err?.message || 'Erro ao criar usuário' })
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params
  if (id === req.userId) {
    res.status(400).json({ error: 'Você não pode deletar sua própria conta' })
    return
  }
  try {
    await prisma.user.delete({ where: { id } })
    res.status(204).send()
  } catch (err: any) {
    res.status(404).json({ error: 'Usuário não encontrado' })
  }
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
