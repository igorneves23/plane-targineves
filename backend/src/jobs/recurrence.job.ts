import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendCardReminderEmail } from '../lib/mailer'
import { nextSundayResetAfter } from '../lib/weekday'

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

/**
 * Próxima execução contada a partir da execução que acabou de vencer — não
 * a partir de "agora". Contar de agora empurrava o horário pra frente a cada
 * rodada (uma tarefa das 8h virava 9h na semana seguinte, se o cron rodasse
 * às 9h). Repete até cair no futuro, então uma parada longa do servidor não
 * gera uma enxurrada de renovações atrasadas — volta direto pro próximo
 * horário válido.
 */
function nextExecutionAfter(
  type: string,
  lastExecution: Date,
  now: Date,
  monthlyWeek?: number | null,
  monthlyWeekday?: number | null,
): Date {
  let next = nextDate(type, lastExecution, monthlyWeek, monthlyWeekday)
  // Teto de segurança: DAILY parado por ~5 anos ainda converge; sem o teto,
  // uma data inválida em algum campo travaria o job num laço infinito.
  for (let guard = 0; next <= now && guard < 2000; guard++) {
    next = nextDate(type, next, monthlyWeek, monthlyWeekday)
  }
  return next
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

    // Semanais não renovam no horário agendado de cada um: todos viram
    // juntos no domingo às 23h, pra que a segunda comece com a semana
    // inteira zerada. Até lá o cartão fica como está — pendente (aparecendo
    // como atrasado, se for o caso) ou concluído. Diários, mensais e anuais
    // seguem renovando no próprio horário.
    if (card.recurringType === 'WEEKLY' && now < nextSundayResetAfter(card.nextExecution!)) {
      continue
    }

    // Virou o período: o próprio cartão renasce em vez de gerar uma cópia.
    // A conclusão vale só para o período que passou — na semana/mês/ano novo
    // a tarefa volta a ser pendente, com o checklist zerado. Sem cópias, o
    // quadro não acumula cartões repetidos e o histórico de comentários,
    // etiquetas e responsáveis fica todo no mesmo cartão.
    const renewedExecution = nextExecutionAfter(
      card.recurringType!,
      card.nextExecution!,
      now,
      card.monthlyWeek,
      card.monthlyWeekday,
    )

    await prisma.$transaction([
      prisma.card.update({
        where: { id: card.id },
        data: { status: 'TODO', nextExecution: renewedExecution },
      }),
      prisma.checklistItem.updateMany({
        where: { cardId: card.id },
        data: { completed: false, completedById: null, completedAt: null },
      }),
    ])

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
    console.log(`[Recurrence] ${due.length} cartão(ões) recorrente(s) renovado(s)`)
  }
}

export function startRecurrenceJob() {
  cron.schedule('0 * * * *', runRecurrenceTick)
  console.log('[Recurrence] Job iniciado — verificação a cada hora')
}
