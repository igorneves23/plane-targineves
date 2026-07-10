import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Clock, X, Pencil, Trash2 } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar } from '../components/ui/Avatar'
import { Board, User } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BOARD_COLORS as COLORS } from '../constants/colors'
import api from '../services/api'

const emptyForm = { title: '', description: '', color: COLORS[0], responsibleId: '' }

// ── Definido FORA do Dashboard para evitar remontagem a cada render ──────────
interface BoardFormModalProps {
  modalTitle: string
  form: { title: string; description: string; color: string; responsibleId: string }
  onFormChange: (f: { title: string; description: string; color: string; responsibleId: string }) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  submitting: boolean
  isEditing: boolean
  users: User[]
}

function BoardFormModal({ modalTitle, form, onFormChange, onSubmit, onClose, submitting, isEditing, users }: BoardFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg1 border border-bdr/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-tx1">{modalTitle}</h2>
          <button onClick={onClose} className="text-tx3 hover:text-tx1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
            placeholder="Nome do quadro"
            required
          />
          <Input
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            placeholder="Descreva o objetivo do quadro"
          />
          <div>
            <label className="block text-sm font-medium text-tx2 mb-2">Responsável (opcional)</label>
            <select
              value={form.responsibleId}
              onChange={(e) => onFormChange({ ...form, responsibleId: e.target.value })}
              className="w-full px-3 py-2.5 bg-bg2 border border-bdr/10 rounded-lg text-tx1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-tx2 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onFormChange({ ...form, color: c })}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{isEditing ? 'Salvar' : 'Criar quadro'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { boards, fetchBoards, loading, createBoard, updateBoard, deleteBoard } = useBoardStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => { fetchBoards() }, [fetchBoards])
  useEffect(() => { api.get<User[]>('/users').then((r) => setUsers(r.data)) }, [])

  function openEdit(e: React.MouseEvent, board: Board) {
    e.stopPropagation()
    setEditingBoard(board)
    setForm({
      title: board.title,
      description: board.description ?? '',
      color: board.color,
      responsibleId: board.responsibleId ?? '',
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const board = await createBoard({ ...form, responsibleId: form.responsibleId || null })
      setShowCreate(false)
      setForm(emptyForm)
      navigate(`/board/${board.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBoard) return
    setSubmitting(true)
    try {
      await updateBoard(editingBoard.id, { ...form, responsibleId: form.responsibleId || null })
      setEditingBoard(null)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, board: Board) {
    e.stopPropagation()
    if (!confirm(`Deletar o quadro "${board.title}"? Esta ação é irreversível.`)) return
    await deleteBoard(board.id)
  }

  return (
    <div className="flex h-screen bg-bg0 text-tx1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">

          {showCreate && (
            <BoardFormModal
              modalTitle="Novo quadro"
              form={form}
              onFormChange={setForm}
              onSubmit={handleCreate}
              onClose={() => { setShowCreate(false); setForm(emptyForm) }}
              submitting={submitting}
              isEditing={false}
              users={users}
            />
          )}
          {editingBoard && (
            <BoardFormModal
              modalTitle="Editar quadro"
              form={form}
              onFormChange={setForm}
              onSubmit={handleUpdate}
              onClose={() => setEditingBoard(null)}
              submitting={submitting}
              isEditing={true}
              users={users}
            />
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-tx1 mb-1">Seus quadros</h2>
            <p className="text-tx2 text-sm">Gerencie seus projetos e equipes</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 bg-bg1 rounded-xl border border-bdr/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="group relative text-left bg-bg1 border border-bdr/5 rounded-xl p-5 hover:border-bdr/20 hover:bg-bg2/80 transition-all cursor-pointer"
                >
                  {/* Ações hover */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEdit(e, board)}
                      className="p-1.5 rounded-lg bg-bg2 text-tx2 hover:text-tx1 hover:bg-bg3 transition-colors"
                      title="Editar quadro"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, board)}
                      className="p-1.5 rounded-lg bg-bg2 text-tx2 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Deletar quadro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${board.color}22` }}
                    >
                      <Layers className="w-5 h-5" style={{ color: board.color }} />
                    </div>
                    <span className="text-xs text-tx3 group-hover:text-tx3 transition-colors pr-14">
                      {board._count?.columns ?? 0} colunas
                    </span>
                  </div>
                  <h3 className="font-semibold text-tx1 mb-1 truncate">{board.title}</h3>
                  {board.description && (
                    <p className="text-xs text-tx3 truncate mb-3">{board.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-tx3">
                      <Clock className="w-3 h-3" />
                      {format(new Date(board.updatedAt), "dd 'de' MMM", { locale: ptBR })}
                    </div>
                    {board.responsible && (
                      <div className="flex items-center gap-1.5 min-w-0" title={board.responsible.name}>
                        <Avatar name={board.responsible.name} src={board.responsible.avatar} size="xs" />
                        <span className="text-xs text-tx3 truncate">{board.responsible.name.split(' ')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={() => { setForm(emptyForm); setShowCreate(true) }}
                className="h-36 border border-dashed border-bdr/10 rounded-xl flex flex-col items-center justify-center gap-2 text-tx3 hover:text-tx2 hover:border-bdr/20 transition-all"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm">Novo quadro</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
