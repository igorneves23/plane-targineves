import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { labelService } from '../../services/label.service'
import { Card, Label } from '../../types'
import { Badge } from '../ui/Badge'

interface Props { card: Card; onUpdate: (card: Card) => void }

export function LabelsSection({ card, onUpdate }: Props) {
  const [labels, setLabels] = useState<Label[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    labelService.list().then(setLabels)
  }, [])

  const cardLabelIds = card.labels?.map((l) => l.labelId) ?? []

  async function toggle(label: Label) {
    if (cardLabelIds.includes(label.id)) {
      await labelService.removeFromCard(card.id, label.id)
      onUpdate({ ...card, labels: card.labels.filter((l) => l.labelId !== label.id) })
    } else {
      await labelService.addToCard(card.id, label.id)
      onUpdate({
        ...card,
        labels: [...card.labels, { id: `tmp-${label.id}`, cardId: card.id, labelId: label.id, label }],
      })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {card.labels?.map(({ label, labelId }) => (
          <Badge key={labelId} color={label.color}>
            {label.name}
          </Badge>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3" /> Adicionar
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-gray-800 border border-white/10 rounded-lg shadow-xl z-20 py-1 max-h-48 overflow-y-auto">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggle(label)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                <span className="text-xs text-gray-300 flex-1 text-left">{label.name}</span>
                {cardLabelIds.includes(label.id) && <span className="text-brand-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
