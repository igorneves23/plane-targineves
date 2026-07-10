import { useState, useEffect } from 'react'
import {
  X, Trash2, Calendar, Flag, RotateCcw, Users, Tag, Paperclip,
  MessageSquare, CheckSquare, AlignLeft, Edit3, Check, Lock
} from 'lucide-react'
import { Card, Priority, CardStatus, RecurringType } from '../../types'
import { cardService } from '../../services/card.service'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
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

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
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
  const { user: currentUser } = useAuthStore()

  // Líder e Membro só podem mudar o status de cartões criados por um administrador
  const locked = currentUser?.role !== 'ADMIN' && card.createdBy?.role === 'ADMIN'

  const [vencimentoValue, setVencimentoValue] = useState(card.dueDate ? toLocalInput(card.dueDate) : '')
  const [horarioValue, setHorarioValue] = useState(card.nextExecution ? toLocalTime(card.nextExecution) : '')
  const [durationValue, setDurationValue] = useState(String(card.durationMinutes ?? 60))

  useEffect(() => {
    cardService.get(card.id).then((c) => setCard(c))
  }, [card.id])

  // Mantém os campos de data/hora em sincronia com o card, sem prender a
  // digitação ao tempo de resposta da API (senão o campo parece travar).
  useEffect(() => {
    setVencimentoValue(card.dueDate ? toLocalInput(card.dueDate) : '')
  }, [card.dueDate])

  useEffect(() => {
    setHorarioValue(card.nextExecution ? toLocalTime(card.nextExecution) : '')
  }, [card.nextExecution])

  useEffect(() => {
    setDurationValue(String(card.durationMinutes ?? 60))
  }, [card.durationMinutes])

  // Atualiza o card local E o store do board (mantém CardItem sincronizado)
  function syncCard(updated: Card) {
    setCard(updated)
    updateCardInStore(updated)
  }

  async function patch(data: Partial<Card>) {
    setSaving(true)
    try {
      const updated = await cardService.update(card.id, data)
      syncCard(updated)
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

  function toLocalInput(iso: string) {
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  function toLocalTime(iso: string) {
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(11, 16)
  }

  function combineDateTime(existingIso: string | null | undefined, time: string): string {
    const [hh, mm] = time.split(':').map(Number)
    const d = existingIso ? new Date(existingIso) : new Date()
    d.setHours(hh, mm, 0, 0)
    return d.toISOString()
  }

  function nextWeekday(existingIso: string | null | undefined, weekday: number): string {
    const now = new Date()
    const time = existingIso ? new Date(existingIso) : now
    const d = new Date(now)
    const diff = (weekday - now.getDay() + 7) % 7
    d.setDate(now.getDate() + diff)
    d.setHours(time.getHours(), time.getMinutes(), 0, 0)
    if (diff === 0 && d.getTime() < now.getTime()) d.setDate(d.getDate() + 7)
    return d.toISOString()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto md:flex md:items-start md:justify-center md:pt-10 md:pb-4 md:px-4">
      {/* Backdrop — desktop only */}
      <div className="hidden md:block absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full min-h-full md:min-h-0 md:max-w-3xl bg-bg1 md:border md:border-bdr/10 md:rounded-2xl shadow-2xl md:animate-slide-up">
        <div className="h-1.5 md:rounded-t-2xl bg-brand-500" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-4 md:px-6 pt-5 pb-3">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(card.title); setEditingTitle(false) } }}
                autoFocus
                className="w-full bg-transparent text-xl font-bold text-tx1 focus:outline-none border-b border-brand-500 pb-1"
              />
            ) : (
              <h2
                onClick={() => !locked && setEditingTitle(true)}
                className={clsx(
                  'text-xl font-bold text-tx1 transition-colors leading-tight',
                  locked ? 'cursor-default' : 'cursor-text hover:text-brand-500'
                )}
              >
                {card.title}
              </h2>
            )}
            <p className="text-xs text-tx3 mt-1">
              Criado por {card.createdBy?.name} · {format(new Date(card.createdAt), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {saving && <span className="text-xs text-tx3 animate-pulse">Salvando...</span>}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bdr/10 text-tx3 hover:text-tx1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {locked && (
          <div className="mx-4 md:mx-6 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Este cartão foi criado pelo administrador — você só pode mudar o status.
          </div>
        )}

        {/* Body — stacks on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:grid md:grid-cols-3 md:divide-x md:divide-bdr/5">

          {/* Main content */}
          <div className="md:col-span-2 px-4 md:px-6 pb-6 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center gap-2 text-tx2 mb-2">
                <AlignLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Descrição</span>
                {!editingDesc && !locked && (
                  <button onClick={() => setEditingDesc(true)} className="ml-auto p-1 rounded hover:bg-bdr/10 text-tx3 hover:text-tx1 transition-colors">
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
                    className="w-full bg-bg2 border border-bdr/10 rounded-lg px-3 py-2 text-sm text-tx1 placeholder-tx3 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg font-medium transition-colors">
                      <Check className="w-3 h-3" /> Salvar
                    </button>
                    <button onClick={() => { setDesc(card.description || ''); setEditingDesc(false) }} className="px-3 py-1.5 text-tx2 hover:text-tx1 text-xs transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => !locked && setEditingDesc(true)}
                  className={clsx(
                    'text-sm text-tx2 min-h-[2rem] leading-relaxed',
                    locked ? 'cursor-default' : 'cursor-text hover:text-tx1'
                  )}
                >
                  {card.description || <span className="italic text-tx3">Clique para adicionar descrição...</span>}
                </p>
              )}
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center gap-2 text-tx2 mb-3">
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Checklist</span>
                {total > 0 && <span className="ml-auto text-xs text-tx3">{done}/{total}</span>}
              </div>
              {total > 0 && (
                <div className="h-1.5 bg-bg2 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
                </div>
              )}
              <ChecklistSection card={card} onUpdate={syncCard} locked={locked} />
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 text-tx2 mb-3">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Comentários</span>
              </div>
              <CommentsSection card={card} onUpdate={syncCard} locked={locked} />
            </div>
          </div>

          {/* Sidebar — shows below content on mobile */}
          <div className="px-4 md:px-4 py-4 md:py-6 space-y-5 border-t border-bdr/5 md:border-t-0">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-tx3 uppercase tracking-wider mb-2">Status</p>
              <div className="flex flex-wrap gap-2 md:block md:space-y-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => patch({ status: s.value } as Partial<Card>)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors md:w-full md:text-left',
                      card.status === s.value ? 'bg-brand-500/20 text-brand-500' : 'text-tx2 hover:bg-bdr/5 hover:text-tx1'
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
                <Flag className="w-3 h-3 text-tx3" />
                <p className="text-xs font-semibold text-tx3 uppercase tracking-wider">Prioridade</p>
              </div>
              <div className="flex flex-wrap gap-2 md:block md:space-y-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => patch({ priority: p.value } as Partial<Card>)}
                    disabled={locked}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 md:w-full md:text-left disabled:opacity-40 disabled:cursor-not-allowed',
                      card.priority === p.value ? 'bg-bdr/10 text-tx1' : 'text-tx2 hover:bg-bdr/5 hover:text-tx1'
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
                <Calendar className="w-3 h-3 text-tx3" />
                <p className="text-xs font-semibold text-tx3 uppercase tracking-wider">Vencimento</p>
              </div>
              <input
                type="datetime-local"
                value={vencimentoValue}
                disabled={locked}
                onChange={(e) => {
                  setVencimentoValue(e.target.value)
                  patch({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<Card>)
                }}
                className="w-full bg-bg2 border border-bdr/10 rounded-lg px-2 py-1.5 text-xs text-tx1 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
              />
              <div className="mt-2">
                <label className="text-xs text-tx3 block mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={durationValue}
                  disabled={locked}
                  onChange={(e) => {
                    setDurationValue(e.target.value)
                    const n = Number(e.target.value)
                    if (e.target.value && n >= 5) patch({ durationMinutes: n } as Partial<Card>)
                  }}
                  className="w-full bg-bg2 border border-bdr/10 rounded-lg px-2 py-1.5 text-xs text-tx1 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3 h-3 text-tx3" />
                <p className="text-xs font-semibold text-tx3 uppercase tracking-wider">Responsáveis</p>
              </div>
              <MembersSection card={card} onUpdate={syncCard} locked={locked} />
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3 h-3 text-tx3" />
                <p className="text-xs font-semibold text-tx3 uppercase tracking-wider">Etiquetas</p>
              </div>
              <LabelsSection card={card} onUpdate={syncCard} locked={locked} />
            </div>

            {/* Recurrence */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-3 h-3 text-tx3" />
                <p className="text-xs font-semibold text-tx3 uppercase tracking-wider">Recorrência</p>
              </div>
              <label className={clsx('flex items-center gap-2 mb-2', locked ? 'cursor-default' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={card.recurring}
                  disabled={locked}
                  onChange={(e) => patch({ recurring: e.target.checked } as Partial<Card>)}
                  className="accent-brand-500 w-4 h-4 disabled:opacity-40"
                />
                <span className="text-xs text-tx2">Ativar recorrência</span>
              </label>
              {card.recurring && (
                <div className="space-y-2">
                  <select
                    value={card.recurringType || ''}
                    disabled={locked}
                    onChange={(e) => patch({ recurringType: e.target.value as RecurringType } as Partial<Card>)}
                    className="w-full bg-bg2 border border-bdr/10 rounded-lg px-2 py-1.5 text-xs text-tx1 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
                  >
                    <option value="">Selecionar...</option>
                    {RECURRING_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {card.recurringType === 'WEEKLY' && (
                    <div>
                      <label className="text-xs text-tx3 block mb-1">Dia da semana</label>
                      <select
                        value={card.nextExecution ? new Date(card.nextExecution).getDay() : ''}
                        disabled={locked}
                        onChange={(e) => patch({ nextExecution: nextWeekday(card.nextExecution, Number(e.target.value)) } as Partial<Card>)}
                        className="w-full bg-bg2 border border-bdr/10 rounded-lg px-2 py-1.5 text-xs text-tx1 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
                      >
                        <option value="">Selecionar...</option>
                        {WEEKDAYS.map((w) => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-tx3 block mb-1">Horário</label>
                    <input
                      type="time"
                      value={horarioValue}
                      disabled={locked}
                      onChange={(e) => {
                        setHorarioValue(e.target.value)
                        if (e.target.value) patch({ nextExecution: combineDateTime(card.nextExecution, e.target.value) } as Partial<Card>)
                      }}
                      className="w-full bg-bg2 border border-bdr/10 rounded-lg px-2 py-1.5 text-xs text-tx1 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Excluir — isolado do botão de fechar (X) para evitar clique acidental */}
            <div className="pt-2 border-t border-bdr/5">
              <button
                onClick={handleDelete}
                disabled={locked}
                title={locked ? 'Apenas o administrador pode excluir este cartão' : undefined}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-tx3 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-tx3 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir cartão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
