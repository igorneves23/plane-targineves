import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import api from '../../services/api'
import { Card, User } from '../../types'
import { Avatar } from '../ui/Avatar'

interface Props { card: Card; onUpdate: (card: Card) => void }

export function MembersSection({ card, onUpdate }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.get<User[]>('/users').then((r) => setUsers(r.data))
  }, [])

  const memberIds = card.members?.map((m) => m.userId) ?? []

  async function toggle(userId: string) {
    if (memberIds.includes(userId)) {
      await api.delete(`/cards/${card.id}/members/${userId}`)
      onUpdate({ ...card, members: card.members.filter((m) => m.userId !== userId) })
    } else {
      await api.post(`/cards/${card.id}/members`, { userId })
      const user = users.find((u) => u.id === userId)!
      onUpdate({
        ...card,
        members: [...card.members, { id: `tmp-${userId}`, cardId: card.id, userId, user }],
      })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {card.members?.map(({ user, userId }) => (
          <div key={userId} className="flex items-center gap-1 bg-bdr/5 rounded-full pl-1 pr-2 py-0.5">
            <Avatar name={user.name} src={user.avatar} size="xs" />
            <span className="text-xs text-tx2">{user.name.split(' ')[0]}</span>
            <button onClick={() => toggle(userId)} className="ml-0.5 text-tx3 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-tx3 hover:text-tx1 transition-colors"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-bg2 border border-bdr/10 rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-tx2 hover:bg-bdr/5 hover:text-tx1 transition-colors"
              >
                <Avatar name={u.name} src={u.avatar} size="xs" />
                <span className="truncate">{u.name}</span>
                {memberIds.includes(u.id) && <span className="ml-auto text-brand-400">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
