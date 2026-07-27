import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendDueReminderEmail } from '../lib/mailer'

// Cron roda a cada 5min — janela de ±5min em torno da antecedência
// configurada no cartão pra não perder o horário entre uma rodada e outra.
const WINDOW_TOLERANCE_MIN = 5

function formatScheduledAt(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLeadTime(minutes: number): string {
  if (minutes % 10080 === 0) {
    const weeks = minutes / 10080
    return weeks === 1 ? '1 semana' : `${weeks} semanas`
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return days === 1 ? '1 dia' : `${days} dias`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? '1 hora' : `${hours} horas`
  }
  return `${minutes} minutos`
}

export function startDueNotificationJob() {
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date()

    const cards = await prisma.card.findMany({
      where: {
        notifyEmail: true,
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

      const leadMinutes = card.notifyLeadMinutes ?? 60
      const diffMin = (referenceTime.getTime() - now.getTime()) / 60000
      const windowMin = leadMinutes - WINDOW_TOLERANCE_MIN
      const windowMax = leadMinutes + WINDOW_TOLERANCE_MIN

      const alreadySent = card.notifiedFor?.getTime() === referenceTime.getTime()
      if (alreadySent || diffMin < windowMin || diffMin > windowMax) continue

      const boardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/board/${card.column.board.id}`
      const scheduledAt = formatScheduledAt(referenceTime)
      const timeLabel = formatLeadTime(leadMinutes)

      for (const member of card.members) {
        try {
          await sendDueReminderEmail(
            member.user.email,
            member.user.name,
            card.title,
            card.column.board.title,
            timeLabel,
            scheduledAt,
            boardUrl
          )
        } catch (err) {
          console.error(`[DueNotification] erro ao enviar lembrete para ${member.user.email}`, err)
        }
      }
      await prisma.card.update({ where: { id: card.id }, data: { notifiedFor: referenceTime } })
    }
  })

  console.log('[DueNotification] Job iniciado — verificação a cada 5 minutos')
}
