import { prisma } from './prisma'
import { weekdayInChurchTimeZone } from './weekday'

/**
 * Cards onde `responsibleId` é membro, mas que fisicamente moram em outro
 * quadro. É uma consulta — não cria nenhuma cópia do cartão. O quadro
 * pessoal do responsável só "enxerga" o mesmo cartão; editar aqui edita o
 * único registro que existe (checklist, comentários, status etc. são
 * sempre os mesmos em qualquer lugar onde o cartão apareça).
 */
export async function getVisitingCards(responsibleId: string, ownBoardId: string) {
  const cards = await prisma.card.findMany({
    where: {
      members: { some: { userId: responsibleId } },
      column: { boardId: { not: ownBoardId } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      labels: { include: { label: true } },
      column: { include: { board: { select: { id: true, title: true, color: true } } } },
      createdBy: { select: { id: true, name: true, avatar: true, role: true } },
      _count: { select: { checklist: true, comments: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return cards
    .map((card) => {
      const referenceDate = card.recurring ? card.nextExecution ?? card.dueDate : card.dueDate
      if (!referenceDate) return null
      const { column, ...rest } = card
      return { ...rest, referenceDate, weekday: weekdayInChurchTimeZone(referenceDate), board: column.board }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
}
