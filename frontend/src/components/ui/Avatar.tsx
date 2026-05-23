import clsx from 'clsx'

interface Props {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { xs: 'w-5 h-5 text-xs', sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }

const colors = [
  'bg-violet-500','bg-blue-500','bg-green-500','bg-yellow-500',
  'bg-rose-500','bg-pink-500','bg-cyan-500','bg-orange-500',
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, src, size = 'md', className }: Props) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-semibold text-white shrink-0 overflow-hidden', sizes[size], !src && colorFor(name), className)}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  )
}
