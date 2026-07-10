import { CheckSquare, Clock, MessageSquare, CheckCircle2 } from 'lucide-react'
import { WeeklyCard } from '../../types'
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

interface Props { card: WeeklyCard; onClick: () => void }

/**
 * Card que mora em outro quadro, mostrado aqui só porque o responsável
 * deste quadro participa dele (ver getVisitingCards no backend). Mesmo
 * registro do card original — não é arrastável nem editável como coluna
 * (borda tracejada + tag do quadro de origem sinalizam isso), mas abre o
 * modal normal ao clicar, onde qualquer edição afeta o único card que existe.
 */
export function VisitingCardTile({ card, onClick }: Props) {
  const doneItems = card.checklist?.filter((i) => i.completed).length ?? 0
  const totalItems = card._count?.checklist ?? card.checklist?.length ?? 0
  const commentCount = card._count?.comments ?? 0
  const isDone = card.status === 'DONE'
  const isOverdue = card.dueDate && isPast(new Date(card.dueDate)) && card.status !== 'DONE'

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-bg1/60 border border-dashed rounded-xl p-3 cursor-pointer',
        'hover:border-bdr/30 hover:shadow-sm transition-all select-none',
        isDone ? 'border-l-4 border-l-green-500/70 bg-green-500/[0.03] border-bdr/[0.1]' : 'border-bdr/[0.12]'
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: card.board.color }} />
        <span className="text-[11px] text-tx3 truncate">{card.board.title}</span>
      </div>

      <p className={clsx(
        'text-sm font-medium leading-snug mb-3 flex items-start gap-1.5',
        isDone ? 'text-tx3 line-through' : 'text-tx1'
      )}>
        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />}
        {card.title}
      </p>

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
