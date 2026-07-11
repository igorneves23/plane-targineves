import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Migração única: o job de recorrência criava a ocorrência da semana como
 * uma cópia TAMBÉM recorrente — na rodada seguinte o cron achava original
 * e cópia vencidos e duplicava os dois (crescimento exponencial, com
 * e-mail de lembrete multiplicado). O job foi corrigido; aqui a gente
 * estanca os clones que já existem: em cada grupo de cartões recorrentes
 * idênticos (mesma coluna, título e recorrência), só o mais antigo — o
 * que a pessoa criou — segue como modelo; os demais viram cartões comuns.
 * Nenhum cartão é apagado (checklist/comentários ficam pra limpeza manual).
 * É seguro rodar de novo: sem clones recorrentes, não faz nada.
 */
async function main() {
  const templates = await prisma.card.findMany({
    where: { recurring: true, recurringType: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, columnId: true, title: true, recurringType: true, createdAt: true },
  })

  const seen = new Set<string>()
  const cloneIds: string[] = []

  for (const card of templates) {
    const key = `${card.columnId}|${card.title.trim().toLowerCase()}|${card.recurringType}`
    if (seen.has(key)) cloneIds.push(card.id)
    else seen.add(key)
  }

  if (cloneIds.length === 0) {
    console.log('[cleanup-recurring] nenhum clone recorrente encontrado, nada a fazer.')
    return
  }

  await prisma.card.updateMany({
    where: { id: { in: cloneIds } },
    data: { recurring: false, recurringType: null, nextExecution: null },
  })
  console.log(`[cleanup-recurring] ${cloneIds.length} clone(s) deixaram de ser recorrentes (cartões mantidos).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
