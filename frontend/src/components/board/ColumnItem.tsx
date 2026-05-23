import { useState } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { Column, Card } from '../../types'
import { CardItem } from './CardItem'
import { useBoardStore } from '../../store/boardStore'
import clsx from 'clsx'

interface Props {
  column: Column
  onCardClick: (card: Card) => void
}

export function ColumnItem({ column, onCardClick }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const [colTitle, setColTitle] = useState(column.title)
  const { createCard, updateColumn, deleteColumn } = useBoardStore()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
  })

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createCard(column.id, newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  async function handleRenameColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!colTitle.trim() || colTitle === column.title) { setEditing(false); return }
    await updateColumn(column.id, colTitle.trim())
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx('w-72 shrink-0 flex flex-col bg-gray-900 rounded-xl border border-white/5', isDragging && 'opacity-50')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5" {...attributes} {...listeners}>
        {editing ? (
          <form onSubmit={handleRenameColumn} className="flex-1 mr-2">
            <input
              value={colTitle}
              onChange={(e) => setColTitle(e.target.value)}
              onBlur={handleRenameColumn}
              autoFocus
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-brand-500"
            />
          </form>
        ) : (
          <span className="text-sm font-semibold text-white truncate">{column.title}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-full">{column.cards.length}</span>
          <div className="relative group/menu">
            <button className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
              <button
                onClick={() => setEditing(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Pencil className="w-3 h-3" /> Renomear
              </button>
              <button
                onClick={() => deleteColumn(column.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[60px]">
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="p-3 border-t border-white/5">
        {adding ? (
          <form onSubmit={handleAddCard} className="space-y-2">
            <textarea
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título do cartão..."
              autoFocus
              rows={2}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
            />
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg font-medium transition-colors">
                Adicionar
              </button>
              <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar cartão
          </button>
        )}
      </div>
    </div>
  )
}
