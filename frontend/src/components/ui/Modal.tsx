import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full bg-bg1 border border-bdr/10 rounded-xl shadow-2xl animate-slide-up', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-bdr/10">
            <h2 className="font-semibold text-tx1">{title}</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-bdr/10 text-tx2 hover:text-tx1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  )
}
