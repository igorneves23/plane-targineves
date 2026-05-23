import { useState, useEffect } from 'react'
import {
  X, Trash2, Calendar, Flag, RotateCcw, Users, Tag, Paperclip,
  MessageSquare, CheckSquare, AlignLeft, Edit3, Check
} from 'lucide-react'
import { Card, Priority, CardStatus, RecurringType } from '../../types'
import { cardService } from '../../services/card.service'
import { useBoardStore } from '../../store/boardStore'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { ChecklistSection } from './ChecklistSection'
import { CommentsSection } from './CommentsSection'
import { MembersSection } from './MembersSection'
import { LabelsSection } from './LabelsSection'
import { format } from 'date-fns'
import clsx from 'clsx'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Baixa', color: '#6b7280' },
  { value: 'MEDIUM', label: 'Média', color: '#3b82f6' },
  { value: 'HIGH', label: 'Alta', color: '#f59e0b' },
  { value: 'URGENT', label: 'Urgente', color: '#ef4444' },
]

const STATUSES: { value: CardStatus; label: string }[] = [
  { value: 'TODO', label: 'A fazer' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DONE', label: 'Concluído' },
]

const RECURRING_TYPES: { value: RecurringType; label: string }[] = [
  { value: 'DAILY', label: 'Diário' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' },
]

interface Props { card: Card; onClose: () => void }

export function CardModal({ card: initialCard, onClose }: Props) {
  const [card, setCard] = useState<Card>(initialCard)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [desc, setDesc] = useState(card.description || '')
  const [saving, setSaving] = useState(false)
  const { updateCardInStore, deleteCard } = useBoardStore()

  useEffect(() => {
    cardService.get(card.id).then((c) => setCard(c))
  }, [card.id])

  async function patch(data: Partial<Card>) {
    setSaving(true)
    try {
      const updated = await cardService.update(card.id, data)
      setCard(updated)
      updateCardInStore(updated)
    } finally {
      setSaving(false)
    }
  }

  async function saveTitle() {
    setEditingTitle(false)
    if (title.trim() && title !== card.title) await patch({ title: title.trim() } as Partial<Card>)
  }

  async function saveDesc() {
    setEditingDesc(false)
    if (desc !== (card.description || '')) await patch({ description: desc } as Partial<Card>)
  }

  async function handleDelete() {
    if (!confirm('Excluir este cartão?')) return
    await deleteCard(card.id, card.columnId)
    onClose()
  }

  const done = card.checklist?.filter((i) => i.completed).length ?? 0
  const total = card.checklist?.length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-4 px-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl animate-slide-up">
        {/* Top color bar */}
        <div className="h-1.5 rounded-t-2xl bg-brand-500" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(card.title); setEditingTitle(false) } }}
                autoFocus
                className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-brand-500 pb-1"
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                className="text-xl font-bold text-white cursor-text hover:text-brand-300 transition-colors leading-tight"
              >
                {card.title}
              </h2>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Criado por {card.createdBy?.name} · {format(new Date(card.createdAt), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {saving && <span className="text-xs text-gray-500 animate-pulse">Salvando...</span>}
            <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0 divide-x divide-white/5">
          {/* Main content */}
          <div className="col-span-2 px-6 pb-6 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <AlignLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Descrição</span>
                {!editingDesc && (
                  <button onClick={() => setEditingDesc(true)} className="ml-auto p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    autoFocus
                    rows={4}
                    placeholder="Adicione uma descrição..."
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg font-medium transition-colors">
                      <Check className="w-3 h-3" /> Salvar
                    </button>
                    <button onClick={() => { setDesc(card.description || ''); setEditingDesc(false) }} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => setEditingDesc(true)}
                  className="text-sm text-gray-400 cursor-text hover:text-gray-300 min-h-[2rem] leading-relaxed"
                >
                  {card.description || <span className="italic text-gray-600">Clique para adicionar descrição...</span>}
                </p>
              )}
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Checklist</span>
                {total > 0 && (
                  <span className="ml-auto text-xs text-gray-500">{done}/{total}</span>
                )}
              </div>
              {total > 0 && (
                <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
                </div>
              )}
              <ChecklistSection card={card} onUpdate={setCard} />
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 text-gray-400 mb-3">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Comentários</span>
              </div>
              <CommentsSection card={card} onUpdate={setCard} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="px-4 py-6 space-y-5">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
              <div className="space-y-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => patch({ status: s.value } as Partial<Card>)}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      card.status === s.value ? 'bg-brand-500/20 text-brand-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flag className="w-3 h-3 text-gray-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prioridade</p>
              </div>
              <div className="space-y-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => patch({ priority: p.value } as Partial<Card>)}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2',
                      card.priority === p.value ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3 h-3 text-gray-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimento</p>
              </div>
              <input
                type="datetime-local"
                value={card.dueDate ? card.dueDate.slice(0, 16) : ''}
                onChange={(e) => patch({ dueDate: e.target.value || null } as Partial<Card>)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3 h-3 text-gray-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsáveis</p>
              </div>
              <MembersSection card={card} onUpdate={setCard} />
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3 h-3 text-gray-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Etiquetas</p>
              </div>
              <LabelsSection card={card} onUpdate={setCard} />
            </div>

            {/* Recurrence */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-3 h-3 text-gray-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recorrência</p>
              </div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={card.recurring}
                  onChange={(e) => patch({ recurring: e.target.checked } as Partial<Card>)}
                  className="accent-brand-500 w-4 h-4"
                />
                <span className="text-xs text-gray-300">Ativar recorrência</span>
              </label>
              {card.recurring && (
                <select
                  value={card.recurringType || ''}
                  onChange={(e) => patch({ recurringType: e.target.value as RecurringType } as Partial<Card>)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Selecionar...</option>
                  {RECURRING_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
