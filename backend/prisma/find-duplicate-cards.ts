import { PrismaClient } from '@prisma/client'
import { getVisitingCards } from '../src/lib/visitingCards'

const prisma = new PrismaClient()

function normalize(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

function timeKey(date: Date): string {
  return `${date.getDay()}-${date.getHours()}-${date.getMinutes()}`
}

/**
 * Diagnóstico (não apaga nada): aponta cards criados à mão num quadro
 * pessoal que parecem ser o mesmo evento de um card de visita que já
 * aparece ali (mesmo título + mesmo dia/horário) — sobra comum de quando
 * alguém duplicava o evento manualmente antes de existir o mecanismo de
 * cartões de visita. Revise a lista e apague o que for de fato duplicata.
 */
async function main() {
  const boards = await prisma.board.findMany({
    where: { responsibleId: { not: null } },
    include: {
      responsible: { select: { id: true, name: true } },
      columns: { include: { cards: true } },
    },
  })

  let found = 0

  for (const board of boards) {
    const visiting = await getVisitingCards(board.responsibleId!, board.id)
    if (visiting.length === 0) continue

    const visitingByKey = new Map<string, typeof visiting[number]>()
    for (const v of visiting) {
      if (!v.referenceDate) continue
      visitingByKey.set(`${normalize(v.title)}|${timeKey(new Date(v.referenceDate))}`, v)
    }

    for (const column of board.columns) {
      for (const card of column.cards) {
        const referenceDate = card.recurring ? card.nextExecution ?? card.dueDate : card.dueDate
        if (!referenceDate) continue
        const key = `${normalize(card.title)}|${timeKey(referenceDate)}`
        const match = visitingByKey.get(key)
        if (!match) continue

        found++
        console.log(
          `\n[${board.title} — responsável: ${board.responsible?.name}]\n` +
          `  Card nativo:  "${card.title}" (id ${card.id}, coluna "${column.title}")\n` +
          `  Já aparece via: "${match.title}" (id ${match.id}, quadro "${match.board.title}")\n` +
          `  Horário: ${referenceDate.toLocaleString('pt-BR')}`
        )
      }
    }
  }

  console.log(found === 0 ? '\nNenhuma duplicata encontrada.' : `\n${found} possível(is) duplicata(s) encontrada(s) acima.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
