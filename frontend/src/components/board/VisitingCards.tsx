import { Users } from 'lucide-react'
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
  if (cards.length === 0) return null

  const todayWeekday = new Date().getDay()
  const daysWithCards = WEEKDAYS.filter((d) => cards.some((c) => c.weekday === d.value))

  return (
    <div className="border-t border-bdr/5 px-6 py-4 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-tx3" />
        <p className="text-sm font-semibold text-tx1">Cartões de outros quadros</p>
        <span className="text-xs text-tx3 bg-bdr/5 px-2 py-0.5 rounded-full">{cards.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
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
    </div>
  )
}
