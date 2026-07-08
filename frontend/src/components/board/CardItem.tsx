import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, CheckCircle2, Clock, RefreshCw, MessageSquare } from 'lucide-react'
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
  const isDone = card.status === 'DONE'
  const isOverdue = card.dueDate && isPast(new Date(card.dueDate)) && card.status !== 'DONE'

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-bg1 border border-bdr/[0.06] rounded-xl p-3 cursor-pointer',
        'hover:border-bdr/20 hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-40 ring-2 ring-brand-500/60 shadow-xl',
        isDone && 'border-l-4 border-l-green-500/70 bg-green-500/[0.03]'
      )}
    >
      {/* Etiquetas coloridas */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {card.labels.map(({ label }) => (
            <span key={label.id} className="h-1.5 rounded-full w-8" style={{ backgroundColor: label.color }} />
          ))}
        </div>
      )}

      {/* Título */}
      <p className={clsx(
        'text-sm font-medium leading-snug mb-3 flex items-start gap-1.5',
        isDone ? 'text-tx3 line-through' : 'text-tx1'
      )}>
        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />}
        {card.title}
      </p>

      {/* Badges e membros */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-1.5">
          {card.priority !== 'LOW' && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[card.priority] }} />
          )}

          {card.dueDate && (
            <span className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              isOverdue
                ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                : 'bg-bdr/5 text-tx3 border border-bdr/5'
            )}>
              <Clock className="w-3 h-3" />
              {formatDueDate(card.dueDate)}
              {card.recurring && <RefreshCw className="w-2.5 h-2.5 ml-0.5" />}
            </span>
          )}

          {totalItems > 0 && (
            <span className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
              doneItems === totalItems
                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                : 'bg-bdr/5 text-tx3 border-bdr/5'
            )}>
              <CheckSquare className="w-3 h-3" />
              {doneItems}/{totalItems}
            </span>
          )}

          {commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-tx3 px-1">
              <MessageSquare className="w-3 h-3" />
              {commentCount}
            </span>
          )}
        </div>

        {card.members?.length > 0 && (
          <div className="flex -space-x-1.5 shrink-0">
            {card.members.slice(0, 3).map(({ user }) => (
              <Avatar key={user.id} name={user.name} src={user.avatar} size="xs" className="ring-1 ring-bg1" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
