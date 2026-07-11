import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendCardReminderEmail } from '../lib/mailer'

// Calcula o Nº dia-da-semana de um mês (ex: 2ª segunda-feira de março).
// nth: 1-4 = primeira..quarta ocorrência; -1 = última ocorrência do mês.
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  if (nth === -1) {
    const last = new Date(year, month + 1, 0)
    const diff = (last.getDay() - weekday + 7) % 7
    last.setDate(last.getDate() - diff)
    return last
  }
  const first = new Date(year, month, 1)
  const diff = (weekday - first.getDay() + 7) % 7
  const day = 1 + diff + (nth - 1) * 7
  return new Date(year, month, day)
}

function nextDate(type: string, from: Date, monthlyWeek?: number | null, monthlyWeekday?: number | null): Date {
  const d = new Date(from)
  if (type === 'DAILY') {
    d.setDate(d.getDate() + 1)
  } else if (type === 'WEEKLY') {
    d.setDate(d.getDate() + 7)
  } else if (type === 'MONTHLY') {
    if (monthlyWeek != null && monthlyWeekday != null) {
      let month = d.getMonth() + 1
      let year = d.getFullYear()
      if (month > 11) { month = 0; year += 1 }
      const next = nthWeekdayOfMonth(year, month, monthlyWeekday, monthlyWeek)
      next.setHours(d.getHours(), d.getMinutes(), 0, 0)
      return next
    }
    d.setMonth(d.getMonth() + 1)
  } else if (type === 'YEARLY') {
    d.setFullYear(d.getFullYear() + 1)
  }
  return d
}

// Exportada separada do cron pra poder ser testada diretamente.
export async function runRecurrenceTick() {
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
    // A ocorrência gerada é um cartão comum, NÃO recorrente — só o
    // original continua como "modelo" da recorrência. Se a cópia herdasse
    // recurring/nextExecution, na rodada seguinte o cron acharia os dois
    // vencidos e criaria dois novos: duplicação exponencial (1→2→4→8...),
    // com e-mail de lembrete multiplicado junto.
    const newCard = await prisma.card.create({
      data: {
        columnId: card.columnId,
        title: card.title,
        description: card.description,
        priority: card.priority,
        status: 'TODO',
        position: count,
        createdById: card.createdById,
        durationMinutes: card.durationMinutes,
      },
    })

    if (card.members.length > 0) {
      await prisma.cardMember.createMany({
        data: card.members.map((m) => ({ cardId: newCard.id, userId: m.userId })),
      })
    }

    await prisma.card.update({
      where: { id: card.id },
      data: { nextExecution: nextDate(card.recurringType!, now, card.monthlyWeek, card.monthlyWeekday) },
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
}

export function startRecurrenceJob() {
  cron.schedule('0 * * * *', runRecurrenceTick)
  console.log('[Recurrence] Job iniciado — verificação a cada hora')
}
