import { Card } from '../../types'
import clsx from 'clsx'

interface Props {
  cards: Card[]
  onCardClick: (card: Card) => void
  startHour?: number
  endHour?: number
  pxPerHour?: number
}

interface PositionedCard {
  card: Card
  start: Date
  durationMin: number
  col: number
  totalCols: number
}

function resolveStart(card: Card): Date | null {
  const iso = card.recurring ? card.nextExecution ?? card.dueDate : card.dueDate
  return iso ? new Date(iso) : null
}

export function hasTimelineSlot(card: Card): boolean {
  return resolveStart(card) !== null
}

function layoutCards(cards: Card[]): PositionedCard[] {
  const items = cards
    .map((card) => {
      const start = resolveStart(card)
      if (!start) return null
      return { card, start, durationMin: card.durationMinutes ?? 60 }
    })
    .filter((x): x is { card: Card; start: Date; durationMin: number } => x !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const positioned: PositionedCard[] = []
  let cluster: typeof items = []
  let clusterEnd = -Infinity

  function flushCluster() {
    if (cluster.length === 0) return
    const columnsEnd: number[] = []
    const assigned: { item: (typeof items)[0]; col: number }[] = []
    for (const item of cluster) {
      const itemStart = item.start.getTime()
      let col = columnsEnd.findIndex((end) => end <= itemStart)
      if (col === -1) {
        col = columnsEnd.length
        columnsEnd.push(0)
      }
      columnsEnd[col] = itemStart + item.durationMin * 60000
      assigned.push({ item, col })
    }
    const totalCols = columnsEnd.length
    for (const { item, col } of assigned) {
      positioned.push({ card: item.card, start: item.start, durationMin: item.durationMin, col, totalCols })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const item of items) {
    const itemStart = item.start.getTime()
    if (cluster.length === 0 || itemStart < clusterEnd) {
      cluster.push(item)
      clusterEnd = Math.max(clusterEnd, itemStart + item.durationMin * 60000)
    } else {
      flushCluster()
      cluster.push(item)
      clusterEnd = itemStart + item.durationMin * 60000
    }
  }
  flushCluster()

  return positioned
}

export function DayTimeline({ cards, onCardClick, startHour = 6, endHour = 23, pxPerHour = 48 }: Props) {
  const positioned = layoutCards(cards)
  const totalHeight = (endHour - startHour) * pxPerHour
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  return (
    <div className="relative flex" style={{ height: totalHeight }}>
      {/* Régua de horas */}
      <div className="w-10 shrink-0 relative">
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-1 text-right text-[10px] text-tx3 -translate-y-1/2"
            style={{ top: (h - startHour) * pxPerHour }}
          >
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Área dos cards */}
      <div className="flex-1 relative border-l border-bdr/10">
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-bdr/5"
            style={{ top: (h - startHour) * pxPerHour }}
          />
        ))}

        {positioned.map(({ card, start, durationMin, col, totalCols }) => {
          const startMin = start.getHours() * 60 + start.getMinutes()
          const top = ((startMin - startHour * 60) / 60) * pxPerHour
          const height = Math.max((durationMin / 60) * pxPerHour, 22)
          const widthPct = 100 / totalCols
          const leftPct = col * widthPct
          const isDone = card.status === 'DONE'
          const endMin = startMin + durationMin
          const endLabel = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`

          return (
            <div
              key={card.id}
              onClick={() => onCardClick(card)}
              title={card.title}
              className={clsx(
                'absolute rounded-lg px-2 py-1 overflow-hidden cursor-pointer border',
                'hover:z-10 hover:shadow-lg transition-shadow',
                isDone
                  ? 'bg-green-500/10 border-green-500/30 text-tx3'
                  : 'bg-brand-500/15 border-brand-500/40 text-tx1'
              )}
              style={{
                top,
                height,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
              }}
            >
              <p className={clsx('text-[11px] font-medium leading-tight truncate', isDone && 'line-through')}>
                {card.title}
              </p>
              {height > 32 && (
                <p className="text-[10px] text-tx3 truncate">
                  {String(start.getHours()).padStart(2, '0')}:{String(start.getMinutes()).padStart(2, '0')} – {endLabel}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
