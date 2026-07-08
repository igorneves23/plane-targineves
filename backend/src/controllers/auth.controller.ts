import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signToken } from '../utils/jwt'
import { AuthRequest } from '../middlewares/auth'
import { sendPasswordResetEmail } from '../lib/mailer'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hora

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'LEADER', 'MEMBER']).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { name, email, password, role } = parsed.data

  try {
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      res.status(409).json({ error: 'Email já cadastrado' })
      return
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: role ?? 'MEMBER' },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    })

    const token = signToken({ userId: user.id, role: user.role })
    res.status(201).json({ user, token })
  } catch (err: any) {
    console.error('[register error]', err)
    res.status(500).json({ error: err?.message || 'Erro interno ao criar conta' })
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const token = signToken({ userId: user.id, role: user.role })
  const { password: _, ...safeUser } = user
  res.json({ user: safeUser, token })
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email } = parsed.data
  const genericResponse = { message: 'Se o email existir, você receberá um link de redefinição em instantes.' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Não revelamos se o email existe ou não
    res.json(genericResponse)
    return
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(rawToken),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`

  try {
    await sendPasswordResetEmail(user.email, user.name, resetUrl)
  } catch (err) {
    console.error('[forgotPassword] erro ao enviar email', err)
  }

  res.json(genericResponse)
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
})

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { token, password } = parsed.data
  const tokenHash = hashToken(token)

  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
  })

  if (!user) {
    res.status(400).json({ error: 'Link de redefinição inválido ou expirado' })
    return
  }

  const hash = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, resetTokenHash: null, resetTokenExpiresAt: null },
  })

  res.json({ message: 'Senha redefinida com sucesso' })
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }
  res.json(user)
}
