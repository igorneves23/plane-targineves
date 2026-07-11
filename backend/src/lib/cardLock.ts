import { Response } from 'express'
import { prisma } from './prisma'
import { AuthRequest } from '../middlewares/auth'

const LOCK_MESSAGE = 'Apenas o administrador pode alterar este cartão. Você só pode visualizar.'

/**
 * Cartões criados por um administrador só podem ser alterados pelo próprio
 * administrador — Líder e Membro só visualizam (nenhum campo, checklist,
 * comentário, etiqueta, anexo, responsável, exclusão ou mover de coluna/
 * quadro é permitido). Se bloqueado, já responde 403 e retorna false.
 */
export async function assertCardEditable(req: AuthRequest, res: Response, cardId: string): Promise<boolean> {
  if (req.userRole === 'ADMIN') return true

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { createdBy: { select: { role: true } } },
  })
  if (!card || card.createdBy.role !== 'ADMIN') return true

  res.status(403).json({ error: LOCK_MESSAGE })
  return false
}
