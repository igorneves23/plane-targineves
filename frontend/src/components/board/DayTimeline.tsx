import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckSquare, Clock, MessageSquare } from 'lucide-react'
import { Card } from '../../types'
import { Avatar } from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'

interface Props {
  cards: Card[]
  onCardClick: (card: Card) => void
  startHour?: number
  endHour?: number
  pxPerHour?: number
  getColor?: (card: Card) => string | null | undefined
  // Mostra a linha vermelha da hora atual — só faz sentido passar true
  // quando esta linha do tempo representa o dia de hoje.
  showNowLine?: boolean
  // Se informado, segurar e arrastar um cartão verticalmente muda o
  // horário dele (mesmo dia, só a hora) — encaixado em `snapMinutes`.
  // Sem isso, os cartões continuam só clicáveis, como antes.
  onReschedule?: (card: Card, newStart: Date) => void
  snapMinutes?: number
}

// Converte #rrggbb em rgba(...) com a opacidade informada (aceita também formatos curtos #rgb)
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: '#6b7280' },
  MEDIUM: { label: 'Média', color: '#3b82f6' },
  HIGH: { label: 'Alta', color: '#f59e0b' },
  URGENT: { label: 'Urgente', color: '#ef4444' },
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

function timeLabel(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface HoverState {
  item: PositionedCard
  x: number
  y: number
}

const TOOLTIP_WIDTH = 260
const DRAG_THRESHOLD_PX = 4 // abaixo disso, é um clique — não um arraste

interface DragState {
  cardId: string
  pointerId: number
  startClientY: number
  originStartMinutes: number
  deltaY: number
}

export function DayTimeline({
  cards, onCardClick, startHour = 6, endHour = 23, pxPerHour = 48, getColor, showNowLine,
  onReschedule, snapMinutes = 15,
}: Props) {
  const positioned = layoutCards(cards)
  const totalHeight = (endHour - startHour) * pxPerHour
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
  const [hovered, setHovered] = useState<HoverState | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const { user: currentUser } = useAuthStore()

  // Recalcula a cada minuto pra linha do "agora" ir andando sem precisar recarregar a página.
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!showNowLine) return
    const id = setInterval(() => forceTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [showNowLine])

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowTop = showNowLine && nowMin >= startHour * 60 && nowMin <= endHour * 60
    ? ((nowMin - startHour * 60) / 60) * pxPerHour
    : null

  // Líder/Membro só pode visualizar cartões criados por um administrador —
  // arrastar mudaria o horário, então fica bloqueado (mesma regra do
  // CardModal/CardItem).
  function isLocked(card: Card) {
    return currentUser?.role !== 'ADMIN' && card.createdBy?.role === 'ADMIN'
  }

  function snapClamp(minutes: number) {
    const snapped = Math.round(minutes / snapMinutes) * snapMinutes
    return Math.max(startHour * 60, Math.min(endHour * 60 - snapMinutes, snapped))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, item: PositionedCard) {
    if (!onReschedule || isLocked(item.card)) return
    e.stopPropagation()
    // Se a captura falhar (raro, mas não custa nada blindar), o clique e o
    // arraste continuam funcionando — só perde a garantia de que os eventos
    // seguem o ponteiro se ele sair de cima do card durante o arraste.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* segue sem captura */ }
    setHovered(null)
    setDrag({
      cardId: item.card.id,
      pointerId: e.pointerId,
      startClientY: e.clientY,
      originStartMinutes: item.start.getHours() * 60 + item.start.getMinutes(),
      deltaY: 0,
    })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>, item: PositionedCard) {
    if (!drag || drag.cardId !== item.card.id) return
    setDrag({ ...drag, deltaY: e.clientY - drag.startClientY })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>, item: PositionedCard) {
    if (!drag || drag.cardId !== item.card.id) return
    try {
      if (e.currentTarget.hasPointerCapture(drag.pointerId)) e.currentTarget.releasePointerCapture(drag.pointerId)
    } catch { /* nada a liberar */ }

    if (Math.abs(drag.deltaY) < DRAG_THRESHOLD_PX) {
      setDrag(null)
      onCardClick(item.card)
      return
    }

    const deltaMinutes = (drag.deltaY / pxPerHour) * 60
    const newMinutes = snapClamp(drag.originStartMinutes + deltaMinutes)
    setDrag(null)
    if (newMinutes === drag.originStartMinutes) return
    const newStart = new Date(item.start)
    newStart.setHours(Math.floor(newMinutes / 60), newMinutes % 60, 0, 0)
    onReschedule?.(item.card, newStart)
  }

  function handleEnter(e: React.MouseEvent<HTMLElement>, item: PositionedCard) {
    if (drag) return
    const rect = e.currentTarget.getBoundingClientRect()
    const overflowsRight = rect.right + 12 + TOOLTIP_WIDTH > window.innerWidth
    const x = overflowsRight ? rect.left - TOOLTIP_WIDTH - 12 : rect.right + 12
    const y = Math.min(rect.top, window.innerHeight - 260)
    setHovered({ item, x: Math.max(8, x), y: Math.max(8, y) })
  }

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

        {nowTop !== null && (
          <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
            <div className="h-px bg-red-500" />
          </div>
        )}

        {positioned.map((item) => {
          const { card, start, durationMin, col, totalCols } = item
          const startMin = start.getHours() * 60 + start.getMinutes()
          const top = ((startMin - startHour * 60) / 60) * pxPerHour
          const height = Math.max((durationMin / 60) * pxPerHour, 22)
          const widthPct = 100 / totalCols
          const leftPct = col * widthPct
          const isDone = card.status === 'DONE'
          const endMin = startMin + durationMin
          const endLabel = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
          const boardColor = getColor?.(card)
          const canDrag = !!onReschedule && !isLocked(card)
          const isDragging = drag?.cardId === card.id

          let displayTop = top
          let startLabel = timeLabel(start)
          let displayEndLabel = endLabel
          if (isDragging && drag) {
            const liveMinutes = snapClamp(drag.originStartMinutes + (drag.deltaY / pxPerHour) * 60)
            const liveEnd = liveMinutes + durationMin
            displayTop = ((liveMinutes - startHour * 60) / 60) * pxPerHour
            startLabel = `${String(Math.floor(liveMinutes / 60)).padStart(2, '0')}:${String(liveMinutes % 60).padStart(2, '0')}`
            displayEndLabel = `${String(Math.floor(liveEnd / 60) % 24).padStart(2, '0')}:${String(liveEnd % 60).padStart(2, '0')}`
          }

          return (
            <div
              key={card.id}
              onClick={canDrag ? undefined : () => onCardClick(card)}
              onPointerDown={canDrag ? (e) => handlePointerDown(e, item) : undefined}
              onPointerMove={canDrag ? (e) => handlePointerMove(e, item) : undefined}
              onPointerUp={canDrag ? (e) => handlePointerUp(e, item) : undefined}
              onMouseEnter={(e) => handleEnter(e, item)}
              onMouseLeave={() => setHovered(null)}
              className={clsx(
                'absolute rounded-lg px-2 py-1 overflow-hidden border select-none',
                isDragging ? 'z-30 shadow-2xl ring-2 ring-brand-500/70 cursor-grabbing' : 'hover:z-10 hover:shadow-lg transition-shadow',
                !isDragging && (canDrag ? 'cursor-grab' : 'cursor-pointer'),
                isDone
                  ? 'bg-green-500/10 border-green-500/30 text-tx3'
                  : boardColor ? 'text-tx1' : 'bg-brand-500/15 border-brand-500/40 text-tx1'
              )}
              style={{
                top: displayTop,
                height,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
                touchAction: canDrag ? 'none' : undefined,
                ...(!isDone && boardColor
                  ? {
                      backgroundColor: hexToRgba(boardColor, 0.18),
                      borderColor: hexToRgba(boardColor, 0.5),
                    }
                  : {}),
              }}
            >
              <p className={clsx('text-[11px] font-medium leading-tight truncate', isDone && 'line-through')}>
                {card.title}
              </p>
              {(height > 32 || isDragging) && (
                <p className="text-[10px] text-tx3 truncate">
                  {startLabel} – {displayEndLabel}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {hovered && createPortal(<TimelineTooltip item={hovered.item} x={hovered.x} y={hovered.y} getColor={getColor} />, document.body)}
    </div>
  )
}

function TimelineTooltip({ item, x, y, getColor }: { item: PositionedCard; x: number; y: number; getColor?: (card: Card) => string | null | undefined }) {
  const { card, start, durationMin } = item
  const endMin = start.getHours() * 60 + start.getMinutes() + durationMin
  const endLabel = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
  const boardColor = getColor?.(card)
  const board = (card as any).board as { title: string; color: string } | undefined
  const priority = PRIORITY_LABEL[card.priority]
  const doneItems = card.checklist?.filter((i) => i.completed).length ?? 0
  const totalItems = card._count?.checklist ?? card.checklist?.length ?? 0
  const commentCount = card._count?.comments ?? card.comments?.length ?? 0

  return (
    <div
      className="fixed z-[100] pointer-events-none bg-bg2 border border-bdr/10 rounded-xl shadow-2xl p-3 space-y-2"
      style={{ top: y, left: x, width: TOOLTIP_WIDTH }}
    >
      {board && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: boardColor ?? board.color }} />
          <span className="text-[11px] text-tx3 truncate">{board.title}</span>
        </div>
      )}

      <p className={clsx('text-sm font-semibold leading-snug', card.status === 'DONE' ? 'text-tx3 line-through' : 'text-tx1')}>
        {card.title}
      </p>

      <div className="flex items-center gap-1.5 text-xs text-tx3">
        <Clock className="w-3 h-3" />
        {timeLabel(start)} – {endLabel}
      </div>

      {card.description && (
        <p className="text-xs text-tx3 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-bdr/5 border border-bdr/5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
          {priority.label}
        </span>

        {totalItems > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-bdr/5 border border-bdr/5 text-tx3">
            <CheckSquare className="w-3 h-3" />
            {doneItems}/{totalItems}
          </span>
        )}

        {commentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-tx3">
            <MessageSquare className="w-3 h-3" />
            {commentCount}
          </span>
        )}
      </div>

      {card.members?.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {card.members.map(({ user }) => (
            <div key={user.id} className="flex items-center gap-1 bg-bdr/5 rounded-full pl-0.5 pr-2 py-0.5">
              <Avatar name={user.name} src={user.avatar} size="xs" />
              <span className="text-[11px] text-tx2">{user.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
