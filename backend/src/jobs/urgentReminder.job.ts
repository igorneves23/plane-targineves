import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendUrgentReminderEmail } from '../lib/mailer'

const HOUR_WINDOW = { min: 55, max: 65 } // minutos antes do horário
const TEN_MIN_WINDOW = { min: 5, max: 15 }

function formatScheduledAt(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function startUrgentReminderJob() {
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date()

    const cards = await prisma.card.findMany({
      where: {
        priority: 'URGENT',
        status: { not: 'DONE' },
        OR: [
          { recurring: true, nextExecution: { not: null } },
          { recurring: false, dueDate: { not: null } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        column: { include: { board: { select: { id: true, title: true } } } },
      },
    })

    for (const card of cards) {
      const referenceTime = card.recurring ? card.nextExecution : card.dueDate
      if (!referenceTime || card.members.length === 0) continue

      const diffMin = (referenceTime.getTime() - now.getTime()) / 60000
      const boardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/board/${card.column.board.id}`
      const scheduledAt = formatScheduledAt(referenceTime)

      const hourAlreadySent = card.urgentHourNotifiedFor?.getTime() === referenceTime.getTime()
      const tenMinAlreadySent = card.urgentTenMinNotifiedFor?.getTime() === referenceTime.getTime()

      if (diffMin >= HOUR_WINDOW.min && diffMin <= HOUR_WINDOW.max && !hourAlreadySent) {
        for (const member of card.members) {
          try {
            await sendUrgentReminderEmail(
              member.user.email,
              member.user.name,
              card.title,
              card.column.board.title,
              '1 hora',
              scheduledAt,
              boardUrl
            )
          } catch (err) {
            console.error(`[UrgentReminder] erro ao enviar lembrete de 1h para ${member.user.email}`, err)
          }
        }
        await prisma.card.update({ where: { id: card.id }, data: { urgentHourNotifiedFor: referenceTime } })
      }

      if (diffMin >= TEN_MIN_WINDOW.min && diffMin <= TEN_MIN_WINDOW.max && !tenMinAlreadySent) {
        for (const member of card.members) {
          try {
            await sendUrgentReminderEmail(
              member.user.email,
              member.user.name,
              card.title,
              card.column.board.title,
              '10 minutos',
              scheduledAt,
              boardUrl
            )
          } catch (err) {
            console.error(`[UrgentReminder] erro ao enviar lembrete de 10min para ${member.user.email}`, err)
          }
        }
        await prisma.card.update({ where: { id: card.id }, data: { urgentTenMinNotifiedFor: referenceTime } })
      }
    }
  })

  console.log('[UrgentReminder] Job iniciado — verificação a cada 5 minutos')
}
