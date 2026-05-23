import { Menu, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import { useSidebar } from '../../context/SidebarContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']

interface Props { title?: string }

export function Topbar({ title }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const { createBoard } = useBoardStore()
  const { setOpen: setSidebarOpen } = useSidebar()
  const navigate = useNavigate()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const board = await createBoard({ title: name.trim(), description: desc, color })
      setOpen(false)
      setName('')
      setDesc('')
      navigate(`/board/${board.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="h-14 border-b border-bdr/5 flex items-center justify-between px-4 md:px-6 bg-bg1/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-tx2 hover:bg-bdr/5 hover:text-tx1 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-tx1 text-lg">{title || 'Plane'}</h1>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo quadro</span>
        </Button>
      </header>

      <Modal open={open} onClose={() => setOpen(false)} title="Criar quadro">
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <Input
            label="Nome do quadro"
            placeholder="ex: Produção de Vídeo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Descrição (opcional)"
            placeholder="Breve descrição..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-tx2 mb-2">Cor</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Criar quadro</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
