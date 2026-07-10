import { useState } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, Trash2, Pencil, ChevronsLeftRight, Clock, LayoutList } from 'lucide-react'
import { Column, Card, WeeklyCard } from '../../types'
import { CardItem } from './CardItem'
import { VisitingCardTile } from './VisitingCardTile'
import { DayTimeline, hasTimelineSlot } from './DayTimeline'
import { useBoardStore } from '../../store/boardStore'
import clsx from 'clsx'

interface Props {
  column: Column
  onCardClick: (card: Card) => void
  boardColor?: string
  // Cards que moram em outro quadro, mas cujo dia da semana bate com o
  // título desta coluna — mesmo registro, só aparecem juntos aqui (ver
  // getVisitingCards). Não são arrastáveis nem contam pra posição da coluna.
  visitingCards?: WeeklyCard[]
  // Colunas calculadas na hora (dia da semana sem coluna própria no quadro)
  // não podem ser renomeadas, excluídas, arrastadas nem receber cartão novo.
  readOnly?: boolean
  // Coluna representa um dia da semana (nome bate com um dia) — começa
  // aberta na visualização de linha do tempo em vez de lista.
  isWeekdayColumn?: boolean
  // Esta coluna representa o dia de hoje — mostra a linha do horário atual.
  isToday?: boolean
}

export function ColumnItem({
  column, onCardClick, boardColor, visitingCards = [], readOnly = false, isWeekdayColumn = false, isToday = false,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const [colTitle, setColTitle] = useState(column.title)
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>(isWeekdayColumn ? 'timeline' : 'list')
  const { createCard, updateColumn, deleteColumn } = useBoardStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
    disabled: readOnly,
  })
  const dragProps = readOnly ? {} : { ...attributes, ...listeners }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createCard(column.id, newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  async function handleRenameColumn(e?: React.FormEvent) {
    e?.preventDefault()
    if (!colTitle.trim() || colTitle === column.title) { setEditing(false); return }
    await updateColumn(column.id, colTitle.trim())
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'shrink-0 flex flex-col rounded-2xl transition-all',
        collapsed ? 'w-12' : 'w-72',
        isDragging && 'opacity-50'
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 rounded-2xl',
          collapsed
            ? 'flex-col h-full bg-bg1 border border-bdr/5 justify-start pt-4 pb-4'
            : 'bg-bg1 border border-bdr/5 border-b-0 rounded-b-none'
        )}
        {...dragProps}
      >
        {collapsed ? (
          <>
            <span className="text-xs font-semibold text-tx1 [writing-mode:vertical-rl] rotate-180 mt-2 truncate max-h-40">
              {column.title}
            </span>
            <span className="text-xs text-tx3 bg-bdr/5 px-1.5 py-0.5 rounded-full">
              {column.cards.length + visitingCards.length}
            </span>
            <button
              onClick={() => setCollapsed(false)}
              className="mt-auto p-1 text-tx3 hover:text-tx1 transition-colors"
            >
              <ChevronsLeftRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {editing ? (
              <form onSubmit={handleRenameColumn} className="flex-1">
                <input
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  onBlur={() => handleRenameColumn()}
                  autoFocus
                  className="w-full bg-transparent text-sm font-bold text-tx1 focus:outline-none border-b border-brand-500"
                />
              </form>
            ) : (
              <span className="flex-1 text-sm font-bold text-tx1 truncate">{column.title}</span>
            )}

            <span className="text-xs font-medium text-tx3 bg-bdr/5 px-2 py-0.5 rounded-full shrink-0">
              {column.cards.length + visitingCards.length}
            </span>

            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
              className="p-1 text-tx3 hover:text-tx1 transition-colors shrink-0"
              title={viewMode === 'list' ? 'Ver linha do tempo' : 'Ver lista'}
            >
              {viewMode === 'list' ? <Clock className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setCollapsed(true)}
              className="p-1 text-tx3 hover:text-tx1 transition-colors shrink-0"
            >
              <ChevronsLeftRight className="w-3.5 h-3.5" />
            </button>

            {!readOnly && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded-lg text-tx3 hover:text-tx1 hover:bg-bdr/10 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-bg2 border border-bdr/10 rounded-xl shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => { setEditing(true); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-tx2 hover:text-tx1 hover:bg-bdr/5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Renomear
                    </button>
                    <button
                      onClick={() => { deleteColumn(column.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
            )}
          </>
        )}
      </div>

      {/* Cards */}
      {!collapsed && (
        <div className="flex-1 flex flex-col bg-bg1/40 border border-bdr/5 border-t-0 rounded-b-2xl">
          {viewMode === 'timeline' ? (
            <div className="flex-1 overflow-y-auto p-2 min-h-[40px]">
              <DayTimeline
                cards={[...column.cards.filter(hasTimelineSlot), ...visitingCards.filter(hasTimelineSlot)]}
                onCardClick={onCardClick}
                getColor={(c) => (c as WeeklyCard).board?.color ?? boardColor}
                showNowLine={isToday}
              />
              {(column.cards.some((c) => !hasTimelineSlot(c)) || visitingCards.some((c) => !hasTimelineSlot(c))) && (
                <div className="mt-3 pt-3 border-t border-bdr/10 space-y-2">
                  <p className="text-[10px] text-tx3 uppercase tracking-wider px-1">Sem horário definido</p>
                  <SortableContext
                    items={column.cards.filter((c) => !hasTimelineSlot(c)).map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {column.cards.filter((c) => !hasTimelineSlot(c)).map((card) => (
                      <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
                    ))}
                  </SortableContext>
                  {visitingCards.filter((c) => !hasTimelineSlot(c)).map((card) => (
                    <VisitingCardTile key={card.id} card={card} onClick={() => onCardClick(card)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[40px]">
              <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {column.cards.map((card) => (
                  <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
                ))}
              </SortableContext>
              {visitingCards.map((card) => (
                <VisitingCardTile key={card.id} card={card} onClick={() => onCardClick(card)} />
              ))}
            </div>
          )}

          {!readOnly && (
          <div className="p-2 pt-0">
            {adding ? (
              <form onSubmit={handleAddCard} className="space-y-2 p-2 bg-bg2/60 rounded-xl border border-bdr/5">
                <textarea
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Título do cartão..."
                  autoFocus
                  rows={2}
                  className="w-full bg-transparent text-sm text-tx1 placeholder-tx3 focus:outline-none resize-none"
                  onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg font-medium transition-colors">
                    Adicionar
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-tx2 hover:text-tx1 text-xs transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-tx3 hover:text-tx1 hover:bg-bdr/5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar um cartão
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  )
}
