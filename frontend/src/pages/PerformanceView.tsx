import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { cardService } from '../services/card.service'
import { useAuthStore } from '../store/authStore'
import { PerformanceEntry } from '../types'

function rateColor(rate: number): string {
  if (rate >= 80) return '#10b981'
  if (rate >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function PerformanceView() {
  const [entries, setEntries] = useState<PerformanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard')
      return
    }
    cardService.performance().then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [user])

  return (
    <div className="flex h-screen bg-bg0 text-tx1 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Desempenho" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-tx1 mb-1">Desempenho por responsável</h2>
              <p className="text-tx2 text-sm">
                Taxa de conclusão de tarefas nos últimos 30 dias, com base nos cartões atribuídos a cada pessoa
              </p>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-bg1 rounded-xl border border-bdr/5 animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-tx3">
                <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                <p>Nenhum cartão com responsável criado nos últimos 30 dias</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => {
                  const color = rateColor(entry.completionRate)
                  return (
                    <div key={entry.user.id} className="bg-bg1 border border-bdr/5 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={entry.user.name} src={entry.user.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-tx1 truncate">{entry.user.name}</span>
                        </div>
                        <span className="text-lg font-bold shrink-0" style={{ color }}>
                          {entry.completionRate}%
                        </span>
                      </div>

                      <div className="h-2 bg-bdr/5 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${entry.completionRate}%`, backgroundColor: color }}
                        />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-tx3">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {entry.completed}/{entry.total} concluídas
                        </span>
                        {entry.overdue > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {entry.overdue} atrasada{entry.overdue > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
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
