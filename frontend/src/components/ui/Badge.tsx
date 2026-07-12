import { X } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  children: React.ReactNode
  color?: string
  className?: string
  onRemove?: () => void
}

export function Badge({ children, color, className, onRemove }: Props) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full hover:bg-black/20 transition-colors -mr-0.5"
          title="Remover"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
