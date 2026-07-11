import { useState } from 'react'
import { Plus, Trash2, Pencil, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import { Card, ChecklistItem } from '../../types'
import { Avatar } from '../ui/Avatar'
import clsx from 'clsx'

interface Props { card: Card; onUpdate: (card: Card) => void; locked?: boolean }

export function ChecklistSection({ card, onUpdate, locked }: Props) {
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [assigneePickerFor, setAssigneePickerFor] = useState<string | null>(null)

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

  function startEdit(item: ChecklistItem) {
    setEditingId(item.id)
    setEditingValue(item.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingValue('')
  }

  async function saveEdit(item: ChecklistItem) {
    const trimmed = editingValue.trim()
    if (!trimmed || trimmed === item.title) {
      cancelEdit()
      return
    }
    const { data } = await api.put(`/checklist/${item.id}`, { title: trimmed })
    onUpdate({ ...card, checklist: card.checklist.map((i) => (i.id === item.id ? data : i)) })
    cancelEdit()
  }

  async function setAssignee(item: ChecklistItem, assigneeId: string | null) {
    const { data } = await api.put(`/checklist/${item.id}`, { assigneeId })
    onUpdate({ ...card, checklist: card.checklist.map((i) => (i.id === item.id ? data : i)) })
    setAssigneePickerFor(null)
  }

  return (
    <div className="space-y-1.5">
      {card.checklist?.map((item) => (
        <div key={item.id} className="group/item py-0.5">
          <div className="flex items-center gap-3">
            {/* Marcar/desmarcar concluído é permitido mesmo em cartão do
                admin — só o texto, a posição e o responsável do item ficam
                travados pra Líder/Membro (ver locked mais abaixo). */}
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleItem(item)}
              className="accent-brand-500 w-4 h-4 shrink-0 cursor-pointer mt-0.5"
            />

            {editingId === item.id ? (
              /* ── Modo edição ── */
              <input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                autoFocus
                onBlur={() => saveEdit(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); saveEdit(item) }
                  if (e.key === 'Escape') cancelEdit()
                }}
                className="flex-1 bg-bg2 border border-brand-500/60 rounded-md px-2 py-0.5 text-sm text-tx1 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            ) : (
              /* ── Modo visualização ── */
              <span
                onDoubleClick={() => !locked && !item.completed && startEdit(item)}
                className={clsx(
                  'text-sm flex-1 leading-snug',
                  item.completed ? 'line-through text-tx3' : 'text-tx1'
                )}
              >
                {item.title}
              </span>
            )}

            {/* Responsável pelo item */}
            <div className="relative shrink-0">
              <button
                onClick={() => !locked && setAssigneePickerFor(assigneePickerFor === item.id ? null : item.id)}
                title={item.assignee ? item.assignee.name : 'Atribuir responsável'}
                disabled={locked}
                className="block disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {item.assignee ? (
                  <Avatar name={item.assignee.name} src={item.assignee.avatar} size="xs" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-dashed border-bdr/30 flex items-center justify-center text-tx3 hover:text-tx1 hover:border-bdr/60 transition-colors">
                    <UserPlus className="w-3 h-3" />
                  </span>
                )}
              </button>

              {assigneePickerFor === item.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAssigneePickerFor(null)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-bg2 border border-bdr/10 rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
                    {(card.members?.length ?? 0) === 0 && (
                      <p className="px-3 py-2 text-xs text-tx3">Adicione responsáveis ao cartão primeiro</p>
                    )}
                    {card.members?.map(({ user }) => (
                      <button
                        key={user.id}
                        onClick={() => setAssignee(item, user.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-tx2 hover:bg-bdr/5 hover:text-tx1 transition-colors"
                      >
                        <Avatar name={user.name} src={user.avatar} size="xs" />
                        <span className="truncate">{user.name}</span>
                        {item.assigneeId === user.id && <span className="ml-auto text-brand-400">✓</span>}
                      </button>
                    ))}
                    {item.assigneeId && (
                      <button
                        onClick={() => setAssignee(item, null)}
                        className="w-full text-left px-3 py-2 text-xs text-tx3 hover:bg-bdr/5 hover:text-red-400 transition-colors border-t border-bdr/5 mt-1"
                      >
                        Remover responsável
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Ações (aparecem no hover) */}
            {!locked && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-all shrink-0">
                {!item.completed && editingId !== item.id && (
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1 rounded hover:bg-bdr/10 text-tx3 hover:text-tx1 transition-colors"
                    title="Editar item"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-tx3 hover:text-red-400 transition-colors"
                  title="Excluir item"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {item.completed && item.completedBy && (
            <p className="text-xs text-tx3 pl-7 mt-0.5">
              Feita por <span className="text-tx2">{item.completedBy.name}</span>
              {item.completedAt && <> às {format(new Date(item.completedAt), 'dd/MM/yyyy HH:mm')}</>}
            </p>
          )}
        </div>
      ))}

      {!locked && (adding ? (
        <form onSubmit={addItem} className="flex gap-2 pt-1">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Novo item..."
            autoFocus
            className="flex-1 bg-bg2 border border-bdr/10 rounded-lg px-3 py-1.5 text-sm text-tx1 placeholder-tx3 focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
          />
          <button type="submit" className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg font-medium transition-colors">
            Adicionar
          </button>
          <button type="button" onClick={() => setAdding(false)} className="px-2 text-tx2 hover:text-tx1 text-xs transition-colors">
            ✕
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-tx3 hover:text-tx1 transition-colors pt-1"
        >
          <Plus className="w-3 h-3" /> Adicionar item
        </button>
      ))}
    </div>
  )
}
