import { Response } from 'express'
import { prisma } from './prisma'
import { AuthRequest } from '../middlewares/auth'

const LOCK_MESSAGE = 'Apenas o administrador pode alterar este cartão. Você só pode mudar o status e marcar itens do checklist.'

/**
 * Cartões criados por um administrador só podem ser alterados pelo próprio
 * administrador — Líder e Membro só visualizam (nenhum campo, etiqueta,
 * anexo, responsável, exclusão ou mover de coluna/quadro é permitido),
 * com exceções pontuais: mudar o status do cartão e marcar/desmarcar
 * itens do checklist como concluídos (ver assertCardFieldsEditable).
 * Comentário não usa esse bloqueio — é conversa, sempre liberado (ver
 * comment.controller.ts). Se bloqueado, já responde 403 e retorna false.
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
 * enviados fazem parte de `allowedFields` — usado no update do cartão em si
 * (só o status) e no update de item de checklist (só o "completed", não o
 * texto/posição/responsável do item).
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
