import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Board, Card } from '../../types'
import { ColumnItem } from './ColumnItem'
import { CardItem } from './CardItem'
import { CardModal } from '../card/CardModal'
import { useBoardStore } from '../../store/boardStore'

interface Props { board: Board }

export function BoardView({ board }: Props) {
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [draggingCard, setDraggingCard] = useState<Card | null>(null)
  const [addingCol, setAddingCol] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const { moveCard, createColumn, reorderColumns } = useBoardStore()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'card') {
      setDraggingCard(event.active.data.current.card)
    }
  }

  function onDragOver(_event: DragOverEvent) {}

  async function onDragEnd(event: DragEndEvent) {
    setDraggingCard(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const isCard = active.data.current?.type === 'card'
    const isColumn = active.data.current?.type === 'column'

    if (isCard) {
      const card = active.data.current?.card as Card
      const targetCol = board.columns.find(
        (c) => c.id === over.id || c.cards.some((cd) => cd.id === over.id)
      )
      if (!targetCol) return
      const targetIndex = targetCol.cards.findIndex((cd) => cd.id === over.id)
      await moveCard(card.id, targetCol.id, targetIndex >= 0 ? targetIndex : targetCol.cards.length)
    }

    if (isColumn) {
      const oldIdx = board.columns.findIndex((c) => c.id === active.id)
      const newIdx = board.columns.findIndex((c) => c.id === over.id)
      if (oldIdx === newIdx) return
      const reordered = [...board.columns]
      const [moved] = reordered.splice(oldIdx, 1)
      reordered.splice(newIdx, 0, moved)
      await reorderColumns(reordered.map((c, i) => ({ id: c.id, position: i })))
    }
  }

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!newColTitle.trim()) return
    await createColumn(board.id, newColTitle.trim())
    setNewColTitle('')
    setAddingCol(false)
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <SortableContext items={board.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 h-full overflow-x-auto pb-4 pt-2 px-6">
            {board.columns.map((col) => (
              <ColumnItem key={col.id} column={col} onCardClick={setActiveCard} boardColor={board.color} />
            ))}

            <div className="w-72 shrink-0">
              {addingCol ? (
                <form onSubmit={handleAddColumn} className="bg-bg1 border border-bdr/5 rounded-xl p-4 space-y-3">
                  <input
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    placeholder="Nome da coluna..."
                    autoFocus
                    className="w-full bg-bg2 border border-bdr/10 rounded-lg px-3 py-2 text-sm text-tx1 placeholder-tx3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    onKeyDown={(e) => { if (e.key === 'Escape') setAddingCol(false) }}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg font-medium transition-colors">
                      Criar
                    </button>
                    <button type="button" onClick={() => setAddingCol(false)} className="px-3 py-1.5 text-tx2 hover:text-tx1 text-sm transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-bdr/10 text-tx3 hover:text-tx1 hover:border-bdr/30 hover:bg-bdr/5 transition-all text-sm"
                >
                  <Plus className="w-4 h-4" /> Adicionar coluna
                </button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {draggingCard && (
            <div className="rotate-2 opacity-90">
              <CardItem card={draggingCard} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {activeCard && (
        <CardModal card={activeCard} onClose={() => setActiveCard(null)} />
      )}
    </>
  )
}
