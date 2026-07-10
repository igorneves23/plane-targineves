import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Gauge } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { YearlyWorkloadChart } from '../components/workload/YearlyWorkloadChart'
import { cardService } from '../services/card.service'
import { useAuthStore } from '../store/authStore'
import { formatHours } from '../lib/format'
import { WorkloadEntry, YearlyWorkloadMonth } from '../types'
import clsx from 'clsx'

const BAR_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a855f7']

type Period = 'week' | 'month' | 'year'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensal' },
  { value: 'year', label: 'Anual' },
]

// Referência de "jornada cheia" pra cada período — a barra compara contra
// isso, não contra o maior valor do grupo (senão o mais sobrecarregado
// sempre parece "cheio", mesmo se estiver ok).
const SCALE_HOURS: Record<'week' | 'month', number> = { week: 40, month: 160 }
const UNIT_LABEL: Record<'week' | 'month', string> = { week: '/semana', month: '/mês' }

export default function WorkloadView() {
  const [period, setPeriod] = useState<Period>('week')
  const [entries, setEntries] = useState<WorkloadEntry[]>([])
  const [yearlyData, setYearlyData] = useState<YearlyWorkloadMonth[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard')
      return
    }
    setLoading(true)
    if (period === 'year') {
      cardService.workloadYearly().then((data) => {
        setYearlyData(data)
        setLoading(false)
      })
      return
    }
    const fetcher = period === 'week' ? cardService.workload : cardService.workloadMonthly
    fetcher().then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [user, period])

  const subtitle = {
    week: 'Estimativa semanal com base na duração e recorrência dos cartões atribuídos a cada pessoa',
    month: 'Estimativa do mês atual com base na duração e recorrência dos cartões atribuídos a cada pessoa',
    year: 'Últimos 12 meses — tarefas recorrentes distribuídas ao longo dos meses em que estiveram ativas, mais os cartões avulsos no mês do vencimento',
  }[period]

  return (
    <div className="flex h-screen bg-bg0 text-tx1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Carga Horária" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-tx1 mb-1">Carga horária por responsável</h2>
              <p className="text-tx2 text-sm">{subtitle}</p>
            </div>

            <div className="flex gap-1.5 mb-6 bg-bg1 border border-bdr/5 rounded-xl p-1 w-fit">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={clsx(
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    period === p.value ? 'bg-brand-500 text-white' : 'text-tx2 hover:text-tx1 hover:bg-bdr/5'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-bg1 rounded-xl border border-bdr/5 animate-pulse" />
                ))}
              </div>
            ) : period === 'year' ? (
              yearlyData.every((m) => m.users.length === 0) ? (
                <EmptyState />
              ) : (
                <div className="bg-bg1 border border-bdr/5 rounded-xl p-5">
                  <YearlyWorkloadChart months={yearlyData} />
                </div>
              )
            ) : entries.length === 0 ? (
              <EmptyState />
            ) : (
              <WorkloadBarList entries={entries} scaleHours={SCALE_HOURS[period]} unitLabel={UNIT_LABEL[period]} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-tx3">
      <Gauge className="w-10 h-10 mb-3 opacity-30" />
      <p>Nenhum cartão com responsável e horário definido ainda</p>
    </div>
  )
}

function WorkloadBarList({ entries, scaleHours, unitLabel }: { entries: WorkloadEntry[]; scaleHours: number; unitLabel: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const scaleMinutes = scaleHours * 60
  const scaleTicks = [0, scaleHours / 4, scaleHours / 2, (scaleHours * 3) / 4, scaleHours].map((h) => Math.round(h))

  return (
    <div className="space-y-3">
      {/* Régua da escala — alinhada com a área da barra de cada linha */}
      <div className="flex items-center gap-3 px-4">
        <div className="w-7 shrink-0" />
        <div className="flex-1 min-w-0 relative h-4">
          {scaleTicks.map((h) => (
            <span
              key={h}
              className={clsx(
                'absolute text-[10px] text-tx3',
                h === 0 ? 'left-0' : h === scaleHours ? 'right-0' : '-translate-x-1/2'
              )}
              style={h > 0 && h < scaleHours ? { left: `${(h / scaleHours) * 100}%` } : undefined}
            >
              {h}h
            </span>
          ))}
        </div>
        <div className="w-4 shrink-0" />
      </div>

      {entries.map((entry, i) => {
        const overCapacity = entry.minutes > scaleMinutes
        const widthPct = Math.min(100, (entry.minutes / scaleMinutes) * 100)
        const barColor = overCapacity ? '#ef4444' : BAR_COLORS[i % BAR_COLORS.length]
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
                  <span className={clsx('text-sm font-semibold shrink-0 ml-2', overCapacity ? 'text-red-400' : 'text-tx1')}>
                    {formatHours(entry.minutes)}
                    <span className="text-tx3 font-normal"> {unitLabel}</span>
                  </span>
                </div>
                <div className="relative h-2 bg-bdr/5 rounded-full overflow-hidden">
                  {scaleTicks.slice(1, -1).map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-bg0/40"
                      style={{ left: `${(h / scaleHours) * 100}%` }}
                    />
                  ))}
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
                      <span className="text-xs text-tx3 shrink-0">{formatHours(c.minutes)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
