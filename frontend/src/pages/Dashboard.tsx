import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Clock, X, Pencil, Trash2 } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Board } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const emptyForm = { title: '', description: '', color: COLORS[0] }

export default function Dashboard() {
  const { boards, fetchBoards, loading, createBoard, updateBoard, deleteBoard } = useBoardStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchBoards() }, [fetchBoards])

  function openEdit(e: React.MouseEvent, board: Board) {
    e.stopPropagation()
    setEditingBoard(board)
    setForm({ title: board.title, description: board.description ?? '', color: board.color })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const board = await createBoard(form)
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
      await updateBoard(editingBoard.id, form)
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

  const BoardModal = ({ title, onSubmit, onClose }: { title: string; onSubmit: (e: React.FormEvent) => void; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Nome do quadro"
            required
          />
          <Input
            label="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descreva o objetivo do quadro"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={submitting}>{editingBoard ? 'Salvar' : 'Criar quadro'}</Button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">

          {showCreate && (
            <BoardModal title="Novo quadro" onSubmit={handleCreate} onClose={() => { setShowCreate(false); setForm(emptyForm) }} />
          )}
          {editingBoard && (
            <BoardModal title="Editar quadro" onSubmit={handleUpdate} onClose={() => setEditingBoard(null)} />
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Seus quadros</h2>
            <p className="text-gray-400 text-sm">Gerencie seus projetos e equipes</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-36 bg-gray-900 rounded-xl border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="group relative text-left bg-gray-900 border border-white/5 rounded-xl p-5 hover:border-white/20 hover:bg-gray-800/80 transition-all cursor-pointer"
                >
                  {/* Ações hover */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEdit(e, board)}
                      className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      title="Editar quadro"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, board)}
                      className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
                    <span className="text-xs text-gray-600 group-hover:text-gray-500 transition-colors pr-14">
                      {board._count?.columns ?? 0} colunas
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-1 truncate">{board.title}</h3>
                  {board.description && (
                    <p className="text-xs text-gray-500 truncate mb-3">{board.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    {format(new Date(board.updatedAt), "dd 'de' MMM", { locale: ptBR })}
                  </div>
                </div>
              ))}

              <button
                onClick={() => { setForm(emptyForm); setShowCreate(true) }}
                className="h-36 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-all"
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
