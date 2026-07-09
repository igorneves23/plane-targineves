import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Gauge } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { cardService } from '../services/card.service'
import { useAuthStore } from '../store/authStore'
import { WorkloadEntry } from '../types'
import clsx from 'clsx'

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

const BAR_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a855f7']

export default function WorkloadView() {
  const [entries, setEntries] = useState<WorkloadEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard')
      return
    }
    cardService.workload().then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [user])

  const observedMax = Math.max(0, ...entries.map((e) => e.minutes))
  const scale = Math.max(observedMax, 8 * 60) // referência mínima de 8h para a barra não parecer cheia à toa

  return (
    <div className="flex h-screen bg-bg0 text-tx1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Carga Horária" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-tx1 mb-1">Carga horária por responsável</h2>
              <p className="text-tx2 text-sm">
                Estimativa semanal com base na duração e recorrência dos cartões atribuídos a cada pessoa
              </p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-bg1 rounded-xl border border-bdr/5 animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-tx3">
                <Gauge className="w-10 h-10 mb-3 opacity-30" />
                <p>Nenhum cartão com responsável e horário definido ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, i) => {
                  const widthPct = Math.min(100, (entry.minutes / scale) * 100)
                  const barColor = BAR_COLORS[i % BAR_COLORS.length]
                  const expanded = expandedId === entry.user.id

                  return (
                    <div key={entry.user.id} className="bg-bg1 border border-bdr/5 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedId(expanded ? null : entry.user.id)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-bdr/[0.02] transition-colors text-left"
                      >
                        <Avatar name={entry.user.name} src={entry.user.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-tx1 truncate">{entry.user.name}</span>
                            <span className="text-sm font-semibold text-tx1 shrink-0 ml-2">
                              {formatHours(entry.minutes)}
                              <span className="text-tx3 font-normal"> /semana</span>
                            </span>
                          </div>
                          <div className="h-2 bg-bdr/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                        {expanded ? (
                          <ChevronUp className="w-4 h-4 text-tx3 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-tx3 shrink-0" />
                        )}
                      </button>

                      {expanded && (
                        <div className="border-t border-bdr/5 divide-y divide-bdr/5">
                          {entry.cards
                            .slice()
                            .sort((a, b) => b.minutes - a.minutes)
                            .map((c) => (
                              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: c.boardColor }} />
                                  <span className="text-xs text-tx2 truncate">{c.title}</span>
                                  <span className="text-[11px] text-tx3 shrink-0">{c.boardTitle}</span>
                                </div>
                                <span className="text-xs text-tx3 shrink-0">{formatHours(c.minutes)}/sem</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
