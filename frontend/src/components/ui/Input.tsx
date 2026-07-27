import clsx from 'clsx'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-tx2">{label}</label>}
      <input
        {...props}
        className={clsx(
          'w-full px-3 py-2 rounded-lg bg-bdr/5 border text-sm text-tx1 placeholder-tx3',
          'transition-all duration-150 hover:border-bdr/25',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-bdr/[0.08]',
          error ? 'border-red-500' : 'border-bdr/10',
          className
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-tx2">{label}</label>}
      <textarea
        {...props}
        className={clsx(
          'w-full px-3 py-2 rounded-lg bg-bdr/5 border border-bdr/10 text-sm text-tx1 placeholder-tx3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors resize-none',
          className
        )}
      />
    </div>
  )
}
