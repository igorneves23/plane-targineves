import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../../services/api'
import { Card, ChecklistItem } from '../../types'
import clsx from 'clsx'

interface Props { card: Card; onUpdate: (card: Card) => void }

export function ChecklistSection({ card, onUpdate }: Props) {
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState('')

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    const { data } = await api.post('/checklist', { cardId: card.id, title: newItem.trim() })
    onUpdate({ ...card, checklist: [...(card.checklist || []), data] })
    setNewItem('')
    setAdding(false)
  }

  async function toggleItem(item: ChecklistItem) {
    const { data } = await api.put(`/checklist/${item.id}`, { completed: !item.completed })
    onUpdate({ ...card, checklist: card.checklist.map((i) => (i.id === item.id ? data : i)) })
  }

  async function deleteItem(id: string) {
    await api.delete(`/checklist/${id}`)
    onUpdate({ ...card, checklist: card.checklist.filter((i) => i.id !== id) })
  }

  return (
    <div className="space-y-2">
      {card.checklist?.map((item) => (
        <div key={item.id} className="flex items-center gap-3 group/item">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => toggleItem(item)}
            className="accent-brand-500 w-4 h-4 shrink-0 cursor-pointer"
          />
          <span className={clsx('text-sm flex-1', item.completed ? 'line-through text-gray-500' : 'text-gray-200')}>
            {item.title}
          </span>
          <button
            onClick={() => deleteItem(item.id)}
            className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      {adding ? (
        <form onSubmit={addItem} className="flex gap-2 pt-1">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Novo item..."
            autoFocus
            className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
          />
          <button type="submit" className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg font-medium transition-colors">
            Adicionar
          </button>
          <button type="button" onClick={() => setAdding(false)} className="px-2 text-gray-400 hover:text-white text-xs transition-colors">
            ✕
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors pt-1"
        >
          <Plus className="w-3 h-3" /> Adicionar item
        </button>
      )}
    </div>
  )
}
