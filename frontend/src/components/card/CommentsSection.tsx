import { useState } from 'react'
import { Trash2, Send } from 'lucide-react'
import api from '../../services/api'
import { Card, Comment } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from '../ui/Avatar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { card: Card; onUpdate: (card: Card) => void }

export function CommentsSection({ card, onUpdate }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const { user } = useAuthStore()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const { data } = await api.post('/comments', { cardId: card.id, content: text.trim() })
      onUpdate({ ...card, comments: [data, ...(card.comments || [])] })
      setText('')
    } finally {
      setSending(false)
    }
  }

  async function deleteComment(id: string) {
    await api.delete(`/comments/${id}`)
    onUpdate({ ...card, comments: card.comments.filter((c) => c.id !== id) })
  }

  return (
    <div className="space-y-4">
      {/* Input */}
      <form onSubmit={submit} className="flex gap-3 items-start">
        {user && <Avatar name={user.name} src={user.avatar} size="sm" className="mt-1 shrink-0" />}
        <div className="flex-1 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Adicionar comentário..."
            className="flex-1 bg-bg2 border border-bdr/10 rounded-lg px-3 py-2 text-sm text-tx1 placeholder-tx3 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-3">
        {card.comments?.map((comment) => (
          <div key={comment.id} className="flex gap-3 group/comment">
            <Avatar name={comment.user.name} src={comment.user.avatar} size="sm" className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-tx1">{comment.user.name}</span>
                <span className="text-xs text-tx3">
                  {format(new Date(comment.createdAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </span>
                {(comment.userId === user?.id || user?.role === 'ADMIN') && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="ml-auto opacity-0 group-hover/comment:opacity-100 p-1 rounded hover:bg-red-500/10 text-tx3 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm text-tx2 mt-0.5 leading-relaxed">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
