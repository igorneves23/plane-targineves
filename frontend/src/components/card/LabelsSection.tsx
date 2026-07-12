import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import { labelService } from '../../services/label.service'
import { Card, Label } from '../../types'
import { Badge } from '../ui/Badge'
import { BOARD_COLORS } from '../../constants/colors'

interface Props { card: Card; onUpdate: (card: Card) => void; locked?: boolean }

export function LabelsSection({ card, onUpdate, locked }: Props) {
  const [labels, setLabels] = useState<Label[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(BOARD_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(BOARD_COLORS[0])

  useEffect(() => {
    labelService.list().then(setLabels)
  }, [])

  const cardLabelIds = card.labels?.map((l) => l.labelId) ?? []

  async function toggle(label: Label) {
    if (cardLabelIds.includes(label.id)) {
      await labelService.removeFromCard(card.id, label.id)
      onUpdate({ ...card, labels: card.labels.filter((l) => l.labelId !== label.id) })
    } else {
      await labelService.addToCard(card.id, label.id)
      onUpdate({
        ...card,
        labels: [...card.labels, { id: `tmp-${label.id}`, cardId: card.id, labelId: label.id, label }],
      })
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const label = await labelService.create(newName.trim(), newColor)
    setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setNewColor(BOARD_COLORS[0])
    setCreating(false)
  }

  function startEdit(label: Label) {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(label: Label) {
    const trimmed = editName.trim()
    if (!trimmed) { cancelEdit(); return }
    const updated = await labelService.update(label.id, { name: trimmed, color: editColor })
    setLabels((prev) => prev.map((l) => (l.id === label.id ? updated : l)).sort((a, b) => a.name.localeCompare(b.name)))
    onUpdate({
      ...card,
      labels: card.labels.map((l) => (l.labelId === label.id ? { ...l, label: updated } : l)),
    })
    cancelEdit()
  }

  async function handleDelete(label: Label) {
    if (!confirm(`Excluir a etiqueta "${label.name}"? Ela será removida de todos os cartões.`)) return
    await labelService.delete(label.id)
    setLabels((prev) => prev.filter((l) => l.id !== label.id))
    onUpdate({ ...card, labels: card.labels.filter((l) => l.labelId !== label.id) })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {card.labels?.map(({ label, labelId }) => (
          <Badge key={labelId} color={label.color} onRemove={locked ? undefined : () => toggle(label)}>
            {label.name}
          </Badge>
        ))}
      </div>

      {!locked && (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-tx3 hover:text-tx1 transition-colors"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-56 bg-bg2 border border-bdr/10 rounded-lg shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
              {labels.map((label) => (
                <div key={label.id} className="group/label">
                  {editingId === label.id ? (
                    <div className="px-3 py-2 space-y-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); saveEdit(label) }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="w-full bg-bg1 border border-brand-500/60 rounded-md px-2 py-1 text-xs text-tx1 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {BOARD_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: c, outline: editColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(label)} className="flex items-center gap-1 px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white text-[11px] rounded-md transition-colors">
                          <Check className="w-3 h-3" /> Salvar
                        </button>
                        <button onClick={cancelEdit} className="px-2 py-1 text-tx3 hover:text-tx1 text-[11px] transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bdr/5 transition-colors">
                      <button onClick={() => toggle(label)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                        <span className="text-xs text-tx2 truncate">{label.name}</span>
                        {cardLabelIds.includes(label.id) && <span className="text-brand-400 text-xs shrink-0">✓</span>}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/label:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => startEdit(label)}
                          className="p-1 rounded hover:bg-bdr/10 text-tx3 hover:text-tx1 transition-colors"
                          title="Editar etiqueta"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(label)}
                          className="p-1 rounded hover:bg-red-500/10 text-tx3 hover:text-red-400 transition-colors"
                          title="Excluir etiqueta"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t border-bdr/5 mt-1 pt-1 px-3">
                {creating ? (
                  <form onSubmit={handleCreate} className="py-1 space-y-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome da etiqueta..."
                      autoFocus
                      className="w-full bg-bg1 border border-bdr/10 rounded-md px-2 py-1 text-xs text-tx1 placeholder-tx3 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      onKeyDown={(e) => { if (e.key === 'Escape') setCreating(false) }}
                    />
                    <div className="flex flex-wrap gap-1">
                      {BOARD_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColor(c)}
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white text-[11px] rounded-md font-medium transition-colors">
                        Criar
                      </button>
                      <button type="button" onClick={() => setCreating(false)} className="px-2 py-1 text-tx3 hover:text-tx1 text-[11px] transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-1.5 py-2 text-xs text-tx3 hover:text-tx1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Nova etiqueta
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </div>
  )
}
