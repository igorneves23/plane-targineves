import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendCardReminderEmail } from '../lib/mailer'

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
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        column: { include: { board: { select: { id: true, title: true } } } },
      },
    })

    for (const card of due) {
      // Se houver data de vencimento, ela marca o fim da recorrência.
      // Sem vencimento, a tarefa se repete indefinidamente.
      if (card.dueDate && now > card.dueDate) {
        await prisma.card.update({
          where: { id: card.id },
          data: { recurring: false, nextExecution: null },
        })
        console.log(`[Recurrence] "${card.title}" encerrada — vencimento atingido`)
        continue
      }

      const count = await prisma.card.count({ where: { columnId: card.columnId } })
      const newCard = await prisma.card.create({
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
          dueDate: card.dueDate,
          nextExecution: nextDate(card.recurringType!, now),
        },
      })

      if (card.members.length > 0) {
        await prisma.cardMember.createMany({
          data: card.members.map((m) => ({ cardId: newCard.id, userId: m.userId })),
        })
      }

      await prisma.card.update({
        where: { id: card.id },
        data: { nextExecution: nextDate(card.recurringType!, now) },
      })

      const boardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/board/${card.column.board.id}`
      for (const member of card.members) {
        try {
          await sendCardReminderEmail(
            member.user.email,
            member.user.name,
            card.title,
            card.column.board.title,
            card.recurringType!,
            boardUrl
          )
        } catch (err) {
          console.error(`[Recurrence] erro ao enviar lembrete para ${member.user.email}`, err)
        }
      }
    }

    if (due.length > 0) {
      console.log(`[Recurrence] Criados ${due.length} cartões recorrentes`)
    }
  })

  console.log('[Recurrence] Job iniciado — verificação a cada hora')
}
