import clsx from 'clsx'

interface Props {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color, className }: Props) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  )
}
