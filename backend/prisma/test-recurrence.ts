import { PrismaClient } from '@prisma/client'
import { runRecurrenceTick } from '../src/jobs/recurrence.job'

/**
 * Teste do job de recorrência: cartão recorrente concluído precisa voltar a
 * pendente (com o checklist zerado) quando o período vira, sem gerar cópias.
 *
 *   npx tsx prisma/_test-recurrence.ts
 *
 * Cria cartões "REC ..." de mentira, confere o resultado e apaga tudo no
 * fim. Só roda em banco local — a trava abaixo evita sujar produção.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? ''
if (!/@(localhost|127\.0\.0\.1|db)[:/]/.test(DATABASE_URL)) {
  console.error('Recusando rodar: este teste cria e apaga cartões, use só num banco local.')
  process.exit(1)
}

const prisma = new PrismaClient()

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  OK  ' : ' FALHA'} | ${label}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

async function makeCard(opts: {
  title: string
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextExecution: Date
  monthlyWeek?: number
  monthlyWeekday?: number
  dueDate?: Date
}) {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@plane.com' } })
  const col = await prisma.column.findFirstOrThrow({ where: { boardId: 'seed-board-1' } })
  const card = await prisma.card.create({
    data: {
      columnId: col.id,
      title: opts.title,
      createdById: admin.id,
      recurring: true,
      recurringType: opts.type,
      nextExecution: opts.nextExecution,
      monthlyWeek: opts.monthlyWeek,
      monthlyWeekday: opts.monthlyWeekday,
      dueDate: opts.dueDate,
      status: 'DONE', // concluído no período que passou
    },
  })
  await prisma.checklistItem.createMany({
    data: [
      { cardId: card.id, title: 'item 1', position: 0, completed: true, completedById: admin.id, completedAt: new Date() },
      { cardId: card.id, title: 'item 2', position: 1, completed: true, completedById: admin.id, completedAt: new Date() },
    ],
  })
  return card
}

async function main() {
  const now = new Date()
  const col = await prisma.column.findFirstOrThrow({ where: { boardId: 'seed-board-1' } })

  // ── 1. Semanal concluído, vencido há 2 dias ────────────────────────────
  const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 2); lastWeek.setHours(7, 30, 0, 0)
  const semanal = await makeCard({ title: 'REC semanal', type: 'WEEKLY', nextExecution: lastWeek })

  const cardsBefore = await prisma.card.count({ where: { columnId: col.id } })
  await runRecurrenceTick()
  const cardsAfter = await prisma.card.count({ where: { columnId: col.id } })

  const s = await prisma.card.findUniqueOrThrow({ where: { id: semanal.id }, include: { checklist: true } })

  console.log('\n── Semanal concluído que venceu ──')
  check('volta para pendente (TODO)', s.status === 'TODO', `status=${s.status}`)
  check('checklist desmarcado', s.checklist.every((i) => !i.completed && !i.completedAt && !i.completedById))
  check('continua recorrente', s.recurring === true)
  check('não cria cartão-cópia', cardsAfter === cardsBefore, `antes=${cardsBefore} depois=${cardsAfter}`)
  check('próxima execução no futuro', !!s.nextExecution && s.nextExecution > now, `${s.nextExecution?.toLocaleString('pt-BR')}`)
  check(
    'preserva o horário 07:30 (sem deriva)',
    s.nextExecution!.getHours() === 7 && s.nextExecution!.getMinutes() === 30,
    `${String(s.nextExecution!.getHours()).padStart(2, '0')}:${String(s.nextExecution!.getMinutes()).padStart(2, '0')}`,
  )
  check('mantém o mesmo dia da semana', s.nextExecution!.getDay() === lastWeek.getDay())

  // ── 2. Deriva de horário: parado há muito tempo ────────────────────────
  const velho = new Date(now); velho.setDate(now.getDate() - 40); velho.setHours(9, 0, 0, 0)
  const antigo = await makeCard({ title: 'REC parado 40 dias', type: 'WEEKLY', nextExecution: velho })
  await runRecurrenceTick()
  const a = await prisma.card.findUniqueOrThrow({ where: { id: antigo.id } })

  console.log('\n── Semanal parado há 40 dias (servidor fora do ar) ──')
  check('recupera para uma data futura', a.nextExecution! > now, `${a.nextExecution?.toLocaleString('pt-BR')}`)
  check('ainda às 09:00', a.nextExecution!.getHours() === 9 && a.nextExecution!.getMinutes() === 0)
  check('mesmo dia da semana do original', a.nextExecution!.getDay() === velho.getDay())
  const semanaEmMs = 7 * 24 * 3600 * 1000
  check('não pula mais de uma semana à frente', a.nextExecution!.getTime() - now.getTime() <= semanaEmMs)

  // ── 3. Mensal por "Nº dia da semana do mês" ────────────────────────────
  const mesPassado = new Date(now); mesPassado.setMonth(now.getMonth() - 1); mesPassado.setHours(20, 0, 0, 0)
  const mensal = await makeCard({
    title: 'REC mensal 2a terça', type: 'MONTHLY', nextExecution: mesPassado,
    monthlyWeek: 2, monthlyWeekday: 2,
  })
  await runRecurrenceTick()
  const m = await prisma.card.findUniqueOrThrow({ where: { id: mensal.id } })

  console.log('\n── Mensal (2ª terça-feira) ──')
  check('volta para pendente', m.status === 'TODO')
  check('próxima execução no futuro', m.nextExecution! > now, `${m.nextExecution?.toLocaleString('pt-BR')}`)
  check('cai numa terça-feira', m.nextExecution!.getDay() === 2, `dia da semana=${m.nextExecution!.getDay()}`)
  const diaDoMes = m.nextExecution!.getDate()
  check('é a 2ª ocorrência do mês (dia 8–14)', diaDoMes >= 8 && diaDoMes <= 14, `dia ${diaDoMes}`)
  check('preserva 20:00', m.nextExecution!.getHours() === 20)

  // ── 4. Anual ──────────────────────────────────────────────────────────
  const anoPassado = new Date(now); anoPassado.setFullYear(now.getFullYear() - 1); anoPassado.setHours(15, 45, 0, 0)
  const anual = await makeCard({ title: 'REC anual', type: 'YEARLY', nextExecution: anoPassado })
  await runRecurrenceTick()
  const y = await prisma.card.findUniqueOrThrow({ where: { id: anual.id } })

  console.log('\n── Anual ──')
  check('volta para pendente', y.status === 'TODO')
  check('próxima execução no futuro', y.nextExecution! > now, `${y.nextExecution?.toLocaleString('pt-BR')}`)
  check('mesmo dia e mês', y.nextExecution!.getDate() === anoPassado.getDate() && y.nextExecution!.getMonth() === anoPassado.getMonth())
  check('preserva 15:45', y.nextExecution!.getHours() === 15 && y.nextExecution!.getMinutes() === 45)

  // ── 5. Recorrência encerrada pelo vencimento ──────────────────────────
  const ontem = new Date(now); ontem.setDate(now.getDate() - 1)
  const fim = new Date(now); fim.setDate(now.getDate() - 3)
  const encerrado = await makeCard({ title: 'REC encerrado', type: 'WEEKLY', nextExecution: ontem, dueDate: fim })
  await runRecurrenceTick()
  const e = await prisma.card.findUniqueOrThrow({ where: { id: encerrado.id } })

  console.log('\n── Vencimento atingido (fim da recorrência) ──')
  check('deixa de ser recorrente', e.recurring === false)
  check('sem próxima execução', e.nextExecution === null)
  check('conclusão permanece (não renova)', e.status === 'DONE', `status=${e.status}`)

  // ── 6. Ainda não venceu: nada muda ────────────────────────────────────
  const amanha = new Date(now); amanha.setDate(now.getDate() + 1)
  const futuro = await makeCard({ title: 'REC futuro', type: 'WEEKLY', nextExecution: amanha })
  await runRecurrenceTick()
  const f = await prisma.card.findUniqueOrThrow({ where: { id: futuro.id }, include: { checklist: true } })

  console.log('\n── Ainda não venceu ──')
  check('conclusão preservada', f.status === 'DONE', `status=${f.status}`)
  check('checklist continua marcado', f.checklist.every((i) => i.completed))
  check('próxima execução inalterada', f.nextExecution!.getTime() === amanha.getTime())

  // Não deixa lixo pra trás: os cartões de teste (e o checklist deles, por
  // cascade) saem do banco mesmo que alguma asserção tenha falhado.
  const { count } = await prisma.card.deleteMany({ where: { title: { startsWith: 'REC ' } } })
  console.log(`\n(limpeza: ${count} cartão(ões) de teste removido(s))`)

  console.log(`${failures === 0 ? 'TODOS OS TESTES PASSARAM' : failures + ' TESTE(S) FALHARAM'}`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
