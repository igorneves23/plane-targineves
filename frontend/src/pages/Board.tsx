import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { Sidebar } from '../components/layout/Sidebar'
import { BoardView } from '../components/board/BoardView'

export default function Board() {
  const { id } = useParams<{ id: string }>()
  const { activeBoard, fetchBoard, fetchBoards, loading } = useBoardStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  useEffect(() => {
    if (id) fetchBoard(id)
  }, [id, fetchBoard])

  if (loading || !activeBoard) {
    return (
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Carregando quadro...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-white/5 flex items-center gap-4 px-6 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: activeBoard.color }} />
            <h1 className="font-semibold text-white">{activeBoard.title}</h1>
          </div>
          {activeBoard.description && (
            <p className="text-sm text-gray-500 hidden md:block">— {activeBoard.description}</p>
          )}
        </header>

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          <BoardView board={activeBoard} />
        </div>
      </div>
    </div>
  )
}
