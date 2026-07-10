import { Response } from 'express'
import { prisma } from './prisma'
import { AuthRequest } from '../middlewares/auth'

const LOCK_MESSAGE = 'Apenas o administrador pode alterar este cartão. Você só pode mudar o status.'

/**
 * Líder e Membro só podem mudar o status de cartões criados por um
 * administrador — qualquer outra alteração (dados do card, checklist,
 * comentários, etiquetas, anexos, responsáveis, exclusão, mover de coluna)
 * é bloqueada. Se bloqueado, já responde 403 e retorna false.
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

/**
 * Como assertCardEditable, mas permite a alteração quando os únicos campos
 * enviados fazem parte de `allowedFields` (usado no update do cartão em si,
 * que deve permitir mudar só o status).
 */
export async function assertCardFieldsEditable(
  req: AuthRequest,
  res: Response,
  cardId: string,
  changedFields: string[],
  allowedFields: string[] = ['status']
): Promise<boolean> {
  if (req.userRole === 'ADMIN') return true

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { createdBy: { select: { role: true } } },
  })
  if (!card || card.createdBy.role !== 'ADMIN') return true

  const onlyAllowed = changedFields.every((f) => allowedFields.includes(f))
  if (onlyAllowed) return true

  res.status(403).json({ error: LOCK_MESSAGE })
  return false
}
