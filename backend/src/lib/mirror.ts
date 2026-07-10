import { prisma } from './prisma'

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Espelha um cartão nos quadros cujo responsável esteja entre os membros
 * deste cartão (exceto o próprio quadro do cartão). O espelho fica na coluna
 * cujo título bate com o dia da semana do cartão (criando a coluna se faltar)
 * e é mantido sincronizado (título, horário, duração, recorrência) a cada
 * chamada — o status é independente por quadro.
 */
export async function syncCardMirrors(cardId: string): Promise<void> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      members: true,
      column: { select: { boardId: true } },
      mirrors: { include: { column: { select: { boardId: true } } } },
    },
  })
  if (!card || card.sourceCardId) return // espelhos não geram outros espelhos

  const referenceDate = card.recurring ? card.nextExecution ?? card.dueDate : card.dueDate
  const memberIds = card.members.map((m) => m.userId)

  const targetBoards = memberIds.length > 0
    ? await prisma.board.findMany({
        where: { responsibleId: { in: memberIds }, id: { not: card.column.boardId } },
        include: { columns: true },
      })
    : []

  const targetBoardIds = new Set(targetBoards.map((b) => b.id))

  // Remove espelhos cujo responsável não está mais entre os membros
  for (const mirror of card.mirrors) {
    if (!targetBoardIds.has(mirror.column.boardId)) {
      await prisma.card.delete({ where: { id: mirror.id } })
    }
  }

  if (!referenceDate || targetBoards.length === 0) return
  const weekdayName = WEEKDAY_NAMES[referenceDate.getDay()]

  for (const board of targetBoards) {
    const responsibleUserId = board.responsibleId!

    let column = board.columns.find((c) => normalize(c.title) === normalize(weekdayName))
    if (!column) {
      const colCount = await prisma.column.count({ where: { boardId: board.id } })
      column = await prisma.column.create({
        data: { boardId: board.id, title: weekdayName, position: colCount },
      })
    }

    const existingMirror = await prisma.card.findFirst({
      where: { sourceCardId: card.id, column: { boardId: board.id } },
    })

    const syncedData = {
      title: card.title,
      description: card.description,
      priority: card.priority,
      dueDate: card.dueDate,
      recurring: card.recurring,
      recurringType: card.recurringType,
      nextExecution: card.nextExecution,
      durationMinutes: card.durationMinutes,
      columnId: column.id,
    }

    if (existingMirror) {
      await prisma.card.update({ where: { id: existingMirror.id }, data: syncedData })
      await prisma.cardMember.upsert({
        where: { cardId_userId: { cardId: existingMirror.id, userId: responsibleUserId } },
        update: {},
        create: { cardId: existingMirror.id, userId: responsibleUserId },
      })
    } else {
      const cardCount = await prisma.card.count({ where: { columnId: column.id } })
      const mirror = await prisma.card.create({
        data: { ...syncedData, position: cardCount, createdById: card.createdById, sourceCardId: card.id },
      })
      await prisma.cardMember.create({ data: { cardId: mirror.id, userId: responsibleUserId } })
    }
  }
}
