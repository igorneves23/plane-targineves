import cron from 'node-cron'
import { prisma } from '../lib/prisma'

function nextDate(type: string, from: Date): Date {
  const d = new Date(from)
  if (type === 'DAILY') d.setDate(d.getDate() + 1)
  else if (type === 'WEEKLY') d.setDate(d.getDate() + 7)
  else if (type === 'MONTHLY') d.setMonth(d.getMonth() + 1)
  else if (type === 'YEARLY') d.setFullYear(d.getFullYear() + 1)
  return d
}

export function startRecurrenceJob() {
  cron.schedule('0 * * * *', async () => {
    const now = new Date()
    const due = await prisma.card.findMany({
      where: {
        recurring: true,
        nextExecution: { lte: now },
        recurringType: { not: null },
      },
    })

    for (const card of due) {
      const count = await prisma.card.count({ where: { columnId: card.columnId } })
      await prisma.card.create({
        data: {
          columnId: card.columnId,
          title: card.title,
          description: card.description,
          priority: card.priority,
          status: 'TODO',
          position: count,
          createdById: card.createdById,
          recurring: card.recurring,
          recurringType: card.recurringType,
          nextExecution: nextDate(card.recurringType!, now),
        },
      })

      await prisma.card.update({
        where: { id: card.id },
        data: { nextExecution: nextDate(card.recurringType!, now) },
      })
    }

    if (due.length > 0) {
      console.log(`[Recurrence] Criados ${due.length} cartões recorrentes`)
    }
  })

  console.log('[Recurrence] Job iniciado — verificação a cada hora')
}
