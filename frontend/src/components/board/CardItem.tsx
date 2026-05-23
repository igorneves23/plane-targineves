import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, Clock, RefreshCw, MessageSquare } from 'lucide-react'
import { Card } from '../../types'
import { Avatar } from '../ui/Avatar'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import clsx from 'clsx'

const PRIORITY_DOT: Record<string, string> = {
  LOW: '#6b7280',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444',
}

function formatDueDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return 'Hoje'
  if (isTomorrow(d)) return 'Amanhã'
  return format(d, "dd 'de' MMM", { locale: ptBR })
}

interface Props { card: Card; onClick: () => void }

export function CardItem({ card, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const doneItems = card.checklist?.filter((i) => i.completed).length ?? 0
  const totalItems = card._count?.checklist ?? card.checklist?.length ?? 0
  const commentCount = card._count?.comments ?? 0
  const isOverdue = card.dueDate && isPast(new Date(card.dueDate)) && card.status !== 'DONE'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-gray-800/70 border border-white/[0.06] rounded-xl p-3 cursor-pointer',
        'hover:border-white/20 hover:bg-gray-800 transition-all select-none',
        isDragging && 'opacity-40 ring-2 ring-brand-500/60 shadow-xl'
      )}
    >
      {/* Etiquetas coloridas */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {card.labels.map(({ label }) => (
            <span
              key={label.id}
              className="h-1.5 rounded-full w-8"
              style={{ backgroundColor: label.color }}
            />
          ))}
        </div>
      )}

      {/* Título */}
      <p className="text-sm font-medium text-white leading-snug mb-3">{card.title}</p>

      {/* Badges e membros */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Prioridade */}
          {card.priority !== 'LOW' && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: PRIORITY_DOT[card.priority] }}
              title={card.priority}
            />
          )}

          {/* Data de vencimento */}
          {card.dueDate && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                isOverdue
                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'bg-white/5 text-gray-400 border border-white/5'
              )}
            >
              <Clock className="w-3 h-3" />
              {formatDueDate(card.dueDate)}
              {card.recurring && <RefreshCw className="w-2.5 h-2.5 ml-0.5" />}
            </span>
          )}

          {/* Checklist */}
          {totalItems > 0 && (
            <span className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
              doneItems === totalItems
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-white/5 text-gray-400 border-white/5'
            )}>
              <CheckSquare className="w-3 h-3" />
              {doneItems}/{totalItems}
            </span>
          )}

          {/* Comentários */}
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 px-1">
              <MessageSquare className="w-3 h-3" />
              {commentCount}
            </span>
          )}
        </div>

        {/* Membros */}
        {card.members?.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {card.members.slice(0, 3).map(({ user }) => (
              <Avatar key={user.id} name={user.name} src={user.avatar} size="xs" className="ring-1 ring-gray-900" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
