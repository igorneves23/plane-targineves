import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

/**
 * Migração única: o app costumava copiar um cartão inteiro (linha própria
 * no banco, com "sourceCardId" apontando pro original) para o quadro de
 * cada responsável. Isso virou uma consulta no lugar de uma cópia — o
 * mesmo cartão aparece em todo lugar sem duplicar checklist/comentários.
 * Este script roda uma vez em cada deploy (é seguro rodar de novo; depois
 * que a coluna "sourceCardId" some do schema, ele só sai sem fazer nada).
 */
async function main() {
  const hasColumn = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'sourceCardId') as exists`
  )
  if (!hasColumn[0]?.exists) {
    console.log('[cleanup-mirrors] coluna sourceCardId já não existe, nada a fazer.')
    return
  }

  const deleted = await prisma.$executeRawUnsafe(`DELETE FROM cards WHERE "sourceCardId" IS NOT NULL`)
  console.log(`[cleanup-mirrors] removidos ${deleted} cartão(ões) espelho duplicado(s).`)

  // Colunas que o mecanismo antigo criava automaticamente (nome = dia da
  // semana) em quadros de responsável, e que ficaram vazias depois da
  // limpeza acima — não fazem mais sentido como colunas reais.
  const emptyWeekdayColumns = await prisma.column.findMany({
    where: {
      title: { in: WEEKDAY_NAMES },
      board: { responsibleId: { not: null } },
      cards: { none: {} },
    },
  })
  if (emptyWeekdayColumns.length > 0) {
    await prisma.column.deleteMany({ where: { id: { in: emptyWeekdayColumns.map((c) => c.id) } } })
    console.log(`[cleanup-mirrors] removidas ${emptyWeekdayColumns.length} coluna(s) de dia-da-semana vazias.`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
