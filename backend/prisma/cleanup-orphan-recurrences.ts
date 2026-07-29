import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Limpeza das "ocorrências órfãs" da recorrência antiga.
 *
 * Até o job ser corrigido, cada virada de período criava uma CÓPIA do cartão
 * recorrente — e a cópia nascia sem dueDate e sem nextExecution. Sem data,
 * ela cai no balde "Sem horário definido" da linha do tempo, e como isso se
 * repetia toda semana, o mesmo título ia se acumulando ali embaixo. O job
 * hoje renova o próprio cartão e não gera mais cópias; este script recolhe
 * as que já ficaram para trás.
 *
 * Só entra na lista o cartão que:
 *   - não é recorrente e não tem nenhuma data (dueDate e nextExecution nulos)
 *   - tem, na MESMA coluna, um cartão recorrente com o mesmo título
 *   - não tem checklist, comentário, etiqueta nem anexo
 *
 * A última condição é a trava de segurança: se alguém escreveu algo na cópia,
 * ela deixa de ser descartável e vai para uma lista à parte, para revisão
 * manual — o script não apaga.
 *
 *   npx tsx prisma/cleanup-orphan-recurrences.ts           → só lista
 *   npx tsx prisma/cleanup-orphan-recurrences.ts --apply   → apaga
 */

const APPLY = process.argv.includes('--apply')

function normalize(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  const cards = await prisma.card.findMany({
    include: {
      column: { select: { title: true, board: { select: { title: true } } } },
      _count: { select: { checklist: true, comments: true, labels: true, attachments: true } },
    },
  })

  // Título normalizado dos cartões recorrentes, por coluna — é o "pai" que
  // prova que aquele título nasceu de uma recorrência.
  const recurringByColumn = new Set<string>()
  for (const card of cards) {
    if (card.recurring) recurringByColumn.add(`${card.columnId}|${normalize(card.title)}`)
  }

  const descartaveis: typeof cards = []
  const comConteudo: typeof cards = []

  for (const card of cards) {
    if (card.recurring || card.dueDate || card.nextExecution) continue
    if (!recurringByColumn.has(`${card.columnId}|${normalize(card.title)}`)) continue

    const temConteudo =
      card._count.checklist > 0 || card._count.comments > 0 ||
      card._count.labels > 0 || card._count.attachments > 0

    if (temConteudo) comConteudo.push(card)
    else descartaveis.push(card)
  }

  if (descartaveis.length === 0 && comConteudo.length === 0) {
    console.log('[cleanup-orphan] nenhuma ocorrência órfã encontrada, nada a fazer.')
    return
  }

  // Agrupa por quadro/coluna/título só pra leitura ficar curta.
  const porGrupo = new Map<string, number>()
  for (const card of descartaveis) {
    const chave = `${card.column.board.title} › ${card.column.title} › ${card.title}`
    porGrupo.set(chave, (porGrupo.get(chave) ?? 0) + 1)
  }

  if (descartaveis.length > 0) {
    console.log(`\n${descartaveis.length} cópia(s) sem data e sem conteúdo:\n`)
    for (const [chave, qtd] of [...porGrupo].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(qtd).padStart(3)}x  ${chave}`)
    }
  }

  if (comConteudo.length > 0) {
    console.log(`\n${comConteudo.length} cópia(s) que têm checklist/comentário/etiqueta — NÃO serão apagadas, revise à mão:\n`)
    for (const card of comConteudo) {
      const c = card._count
      console.log(
        `  "${card.title}" (id ${card.id}) em ${card.column.board.title} › ${card.column.title}\n` +
        `      checklist=${c.checklist} comentários=${c.comments} etiquetas=${c.labels} anexos=${c.attachments}`
      )
    }
  }

  if (!APPLY) {
    console.log('\n(simulação — nada foi apagado. Rode com --apply para remover as cópias sem conteúdo.)')
    return
  }

  const { count } = await prisma.card.deleteMany({ where: { id: { in: descartaveis.map((c) => c.id) } } })
  console.log(`\n[cleanup-orphan] ${count} cópia(s) removida(s).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
