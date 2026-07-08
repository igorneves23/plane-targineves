import { useEffect, useState } from 'react'
import { CheckSquare, Clock, MessageSquare, RefreshCw, LayoutList } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { CardModal } from '../components/card/CardModal'
import { DayTimeline } from '../components/board/DayTimeline'
import { cardService } from '../services/card.service'
import { WeeklyCard } from '../types'
import { format } from 'date-fns'
import clsx from 'clsx'

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
]

const PRIORITY_DOT: Record<string, string> = {
  LOW: '#6b7280',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
}

export default function WeeklyView() {
  const [cards, setCards] = useState<WeeklyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState<WeeklyCard | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline')

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    cardService.weekly().then((data) => {
      setCards(data)
      setLoading(false)
    })
  }

  function handleClose() {
    setActiveCard(null)
    load()
  }

  const todayWeekday = new Date().getDay()

  return (
    <div className="flex h-screen bg-bg0 text-tx1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Visão Semanal" />
        <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setViewMode(viewMode === 'timeline' ? 'list' : 'timeline')}
              className="flex items-center gap-1.5 text-xs text-tx3 hover:text-tx1 bg-bg1 border border-bdr/10 rounded-lg px-3 py-1.5 transition-colors"
            >
              {viewMode === 'timeline' ? <LayoutList className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {viewMode === 'timeline' ? 'Ver como lista' : 'Ver linha do tempo'}
            </button>
          </div>
          {loading ? (
            <div className="flex gap-4 h-full">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="w-64 shrink-0 h-full bg-bg1 rounded-xl border border-bdr/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 h-full">
              {WEEKDAYS.map((day) => {
                const dayCards = cards
                  .filter((c) => c.weekday === day.value)
                  .sort((a, b) => new Date(a.referenceDate).getTime() - new Date(b.referenceDate).getTime())

                return (
                  <div
                    key={day.value}
                    className={clsx(
                      'w-64 shrink-0 flex flex-col rounded-2xl bg-bg1/40 border',
                      day.value === todayWeekday ? 'border-brand-500/40' : 'border-bdr/5'
                    )}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl bg-bg1 border border-bdr/5 border-b-0">
                      <span className={clsx(
                        'text-sm font-bold',
                        day.value === todayWeekday ? 'text-brand-400' : 'text-tx1'
                      )}>
                        {day.label}
                      </span>
                      <span className="text-xs font-medium text-tx3 bg-bdr/5 px-2 py-0.5 rounded-full">
                        {dayCards.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {dayCards.length === 0 && (
                        <p className="text-xs text-tx3 text-center py-6">Nada programado</p>
                      )}
                      {viewMode === 'timeline' && dayCards.length > 0 && (
                        <DayTimeline
                          cards={dayCards}
                          onCardClick={(c) => setActiveCard(c as WeeklyCard)}
                          getColor={(c) => (c as WeeklyCard).board.color}
                        />
                      )}
                      {viewMode === 'list' && dayCards.map((card) => {
                        const doneItems = card.checklist?.filter((i) => i.completed).length ?? 0
                        const totalItems = card._count?.checklist ?? card.checklist?.length ?? 0
                        const commentCount = card._count?.comments ?? 0
                        const isDone = card.status === 'DONE'

                        return (
                          <div
                            key={card.id}
                            onClick={() => setActiveCard(card)}
                            className={clsx(
                              'bg-bg1 border border-bdr/[0.06] rounded-xl p-3 cursor-pointer',
                              'hover:border-bdr/20 hover:shadow-sm transition-all select-none',
                              isDone && 'border-l-4 border-l-green-500/70 bg-green-500/[0.03]'
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: card.board.color }} />
                              <span className="text-xs text-tx3 truncate">{card.board.title}</span>
                            </div>

                            <p className={clsx(
                              'text-sm font-medium leading-snug mb-2',
                              isDone ? 'text-tx3 line-through' : 'text-tx1'
                            )}>
                              {card.title}
                            </p>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center flex-wrap gap-1.5">
                                {card.priority !== 'LOW' && (
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[card.priority] }} />
                                )}

                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-bdr/5 text-tx3 border border-bdr/5">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(card.referenceDate), 'HH:mm')}
                                  {card.recurring && <RefreshCw className="w-2.5 h-2.5 ml-0.5" />}
                                </span>

                                {totalItems > 0 && (
                                  <span className={clsx(
                                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
                                    doneItems === totalItems
                                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                      : 'bg-bdr/5 text-tx3 border-bdr/5'
                                  )}>
                                    <CheckSquare className="w-3 h-3" />
                                    {doneItems}/{totalItems}
                                  </span>
                                )}

                                {commentCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-tx3 px-1">
                                    <MessageSquare className="w-3 h-3" />
                                    {commentCount}
                                  </span>
                                )}
                              </div>
                            </div>

                            {card.members?.length > 0 && (
                              <div className="flex -space-x-1.5 mt-2">
                                {card.members.slice(0, 3).map(({ user }) => (
                                  <Avatar key={user.id} name={user.name} src={user.avatar} size="xs" className="ring-1 ring-bg1" />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {activeCard && <CardModal card={activeCard} onClose={handleClose} />}
    </div>
  )
}
