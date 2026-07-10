import { useState } from 'react'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'
import { WeeklyCard } from '../../types'
import { DayTimeline } from './DayTimeline'
import clsx from 'clsx'

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
]

interface Props {
  cards: WeeklyCard[]
  onCardClick: (card: WeeklyCard) => void
}

/**
 * Cartões que moram em outros quadros, mas onde o responsável deste quadro
 * é membro — mesmo cartão, só uma visualização (ver getVisitingCards no
 * backend). Não é arrastável nem editável aqui como coluna: é um resumo
 * informativo, igual à Visão Semanal. Editar o cartão em si (status,
 * checklist etc.) continua funcionando normal pelo modal.
 */
export function VisitingCards({ cards, onCardClick }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (cards.length === 0) return null

  const todayWeekday = new Date().getDay()
  const daysWithCards = WEEKDAYS.filter((d) => cards.some((c) => c.weekday === d.value))

  return (
    <div className="border-t border-bdr/5 shrink-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-6 py-3 hover:bg-bdr/[0.03] transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-tx3" /> : <ChevronRight className="w-3.5 h-3.5 text-tx3" />}
        <Users className="w-4 h-4 text-tx3" />
        <p className="text-sm font-semibold text-tx1">Cartões de outros quadros</p>
        <span className="text-xs text-tx3 bg-bdr/5 px-2 py-0.5 rounded-full">{cards.length}</span>
      </button>
      {expanded && (
      <div className="px-6 pb-4 flex gap-3 overflow-x-auto">
        {daysWithCards.map((day) => {
          const dayCards = cards
            .filter((c) => c.weekday === day.value)
            .sort((a, b) => new Date(a.referenceDate).getTime() - new Date(b.referenceDate).getTime())

          return (
            <div
              key={day.value}
              className={clsx(
                'w-56 shrink-0 rounded-xl border bg-bg1/40',
                day.value === todayWeekday ? 'border-brand-500/40' : 'border-bdr/5'
              )}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-bdr/5">
                <span className={clsx('text-xs font-bold', day.value === todayWeekday ? 'text-brand-400' : 'text-tx2')}>
                  {day.label}
                </span>
                <span className="text-[11px] text-tx3">{dayCards.length}</span>
              </div>
              <div className="p-2">
                <DayTimeline
                  cards={dayCards}
                  onCardClick={(c) => onCardClick(c as WeeklyCard)}
                  getColor={(c) => (c as WeeklyCard).board.color}
                  pxPerHour={32}
                />
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
