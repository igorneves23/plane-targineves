import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, MessageSquare, Calendar, AlertCircle } from 'lucide-react'
import { Card } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import clsx from 'clsx'

const priorityIcon: Record<string, { icon: typeof AlertCircle; color: string }> = {
  LOW: { icon: AlertCircle, color: '#6b7280' },
  MEDIUM: { icon: AlertCircle, color: '#3b82f6' },
  HIGH: { icon: AlertCircle, color: '#f59e0b' },
  URGENT: { icon: AlertCircle, color: '#ef4444' },
}

interface Props { card: Card; onClick: () => void }

export function CardItem({ card, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const doneItems = card.checklist?.filter((i) => i.completed).length ?? 0
  const totalItems = card.checklist?.length ?? 0
  const isOverdue = card.dueDate && isPast(new Date(card.dueDate)) && card.status !== 'DONE'
  const PIcon = priorityIcon[card.priority]

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-gray-800 border border-white/5 rounded-lg p-3 cursor-pointer hover:border-brand-500/40 hover:bg-gray-750 transition-all group select-none',
        isDragging && 'opacity-40 ring-2 ring-brand-500'
      )}
    >
      {/* Labels */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map(({ label }) => (
            <span key={label.id} className="h-1.5 rounded-full w-8" style={{ backgroundColor: label.color }} />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-white leading-snug mb-2">{card.title}</p>

      {/* Meta */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {PIcon && <PIcon.icon className="w-3 h-3" style={{ color: PIcon.color }} />}
          {card.dueDate && (
            <span className={clsx('flex items-center gap-1 text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
              <Calendar className="w-3 h-3" />
              {format(new Date(card.dueDate), 'dd MMM', { locale: ptBR })}
            </span>
          )}
          {totalItems > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <CheckSquare className="w-3 h-3" />
              {doneItems}/{totalItems}
            </span>
          )}
          {(card._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="w-3 h-3" />
              {card._count!.comments}
            </span>
          )}
        </div>
        {card.members?.length > 0 && (
          <div className="flex -space-x-1.5">
            {card.members.slice(0, 3).map(({ user }) => (
              <Avatar key={user.id} name={user.name} src={user.avatar} size="xs" className="ring-1 ring-gray-800" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
