import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LayoutList, BarChart3 } from 'lucide-react'
import { YearlyWorkloadMonth } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import { categoricalColor } from '../../lib/categoricalPalette'
import { formatHours } from '../../lib/format'
import clsx from 'clsx'

const MAX_SERIES = 7
const CHART_HEIGHT = 220
const OTHER_KEY = '__other__'

interface Segment {
  key: string
  name: string
  minutes: number
  color: string
}

interface MonthColumn {
  month: string
  label: string
  segments: Segment[]
  total: number
}

interface Props { months: YearlyWorkloadMonth[] }

export function YearlyWorkloadChart({ months }: Props) {
  const { theme } = useTheme()
  const [hover, setHover] = useState<{ month: string; x: number; y: number } | null>(null)
  const [tableView, setTableView] = useState(false)

  const { series, columns, maxTotal } = useMemo(() => {
    const totals = new Map<string, { name: string; total: number }>()
    for (const m of months) {
      for (const u of m.users) {
        const cur = totals.get(u.id)
        if (cur) cur.total += u.minutes
        else totals.set(u.id, { name: u.name, total: u.minutes })
      }
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1].total - a[1].total)
    const top = ranked.slice(0, MAX_SERIES)
    const rest = ranked.slice(MAX_SERIES)
    const otherColor = theme === 'dark' ? '#807e77' : '#c3c2b7'

    const series = top.map(([id, v], i) => ({ id, name: v.name, color: categoricalColor(i, theme) }))
    if (rest.length > 0) series.push({ id: OTHER_KEY, name: `Outros (${rest.length})`, color: otherColor })

    const columns: MonthColumn[] = months.map((m) => {
      const byId = new Map(m.users.map((u) => [u.id, u.minutes]))
      const segments: Segment[] = top.map(([id, v]) => ({ key: id, name: v.name, minutes: byId.get(id) ?? 0, color: categoricalColor(top.findIndex(([tid]) => tid === id), theme) }))
      if (rest.length > 0) {
        const otherMinutes = rest.reduce((sum, [id]) => sum + (byId.get(id) ?? 0), 0)
        segments.push({ key: OTHER_KEY, name: `Outros (${rest.length})`, minutes: otherMinutes, color: otherColor })
      }
      const total = segments.reduce((sum, s) => sum + s.minutes, 0)
      return { month: m.month, label: m.label, segments, total }
    })

    const maxTotal = Math.max(60, ...columns.map((c) => c.total))

    return { series, columns, maxTotal }
  }, [months, theme])

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((maxTotal * f) / 60))
  const hoveredColumn = hover ? columns.find((c) => c.month === hover.month) : null

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setTableView((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-tx3 hover:text-tx1 bg-bg1 border border-bdr/10 rounded-lg px-3 py-1.5 transition-colors"
        >
          {tableView ? <BarChart3 className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
          {tableView ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {tableView ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-bdr/10">
                <th className="text-left py-2 pr-3 text-xs font-semibold text-tx3 uppercase tracking-wider">Mês</th>
                {series.map((s) => (
                  <th key={s.id} className="text-right py-2 px-3 text-xs font-semibold text-tx3 uppercase tracking-wider whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </th>
                ))}
                <th className="text-right py-2 pl-3 text-xs font-semibold text-tx3 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.month} className="border-b border-bdr/5">
                  <td className="py-2 pr-3 text-tx1 font-medium whitespace-nowrap">{c.label}</td>
                  {series.map((s) => {
                    const seg = c.segments.find((x) => x.key === s.id)
                    return (
                      <td key={s.id} className="text-right py-2 px-3 text-tx2 whitespace-nowrap">
                        {seg && seg.minutes > 0 ? formatHours(seg.minutes) : <span className="text-tx3">—</span>}
                      </td>
                    )
                  })}
                  <td className="text-right py-2 pl-3 text-tx1 font-semibold whitespace-nowrap">{formatHours(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex" style={{ height: CHART_HEIGHT }}>
            {/* Eixo Y */}
            <div className="w-10 shrink-0 relative">
              {yTicks.map((h, i) => (
                <span
                  key={i}
                  className="absolute right-1.5 text-[10px] text-tx3 -translate-y-1/2"
                  style={{ bottom: `${(i / (yTicks.length - 1)) * 100}%` }}
                >
                  {h}h
                </span>
              ))}
            </div>

            {/* Barras */}
            <div className="flex-1 relative flex items-stretch gap-2 border-l border-b border-bdr/10 pl-2">
              {yTicks.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-bdr/5 pointer-events-none"
                  style={{ bottom: `${(i / (yTicks.length - 1)) * 100}%` }}
                />
              ))}

              {columns.map((c) => {
                let cumulative = 0
                const nonZero = c.segments.filter((s) => s.minutes > 0)
                return (
                  <div
                    key={c.month}
                    className="flex-1 h-full relative cursor-pointer group"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHover({ month: c.month, x: rect.left + rect.width / 2, y: rect.top })
                    }}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div className="absolute inset-0 rounded-t-sm group-hover:bg-bdr/[0.03] transition-colors" />
                    {nonZero.map((s, idx) => {
                      const heightPct = (s.minutes / maxTotal) * 100
                      const bottomPct = (cumulative / maxTotal) * 100
                      cumulative += s.minutes
                      const isTop = idx === nonZero.length - 1
                      return (
                        <div
                          key={s.key}
                          className={clsx('absolute left-0 right-0', isTop && 'rounded-t-sm')}
                          style={{
                            bottom: `${bottomPct}%`,
                            height: `${heightPct}%`,
                            backgroundColor: s.color,
                            boxShadow: idx > 0 ? 'inset 0 2px 0 0 rgb(var(--bg1))' : undefined,
                          }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Labels dos meses */}
          <div className="flex mt-1.5">
            <div className="w-10 shrink-0" />
            <div className="flex-1 flex gap-2 pl-2">
              {columns.map((c) => (
                <span key={c.month} className="flex-1 text-center text-[10px] text-tx3 truncate">{c.label}</span>
              ))}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-bdr/5">
            {series.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-tx2">{s.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {hoveredColumn && hover && createPortal(
        <MonthTooltip data={hoveredColumn} x={hover.x} y={hover.y} />,
        document.body
      )}
    </div>
  )
}

function MonthTooltip({ data, x, y }: { data: MonthColumn; x: number; y: number }) {
  const nonZero = [...data.segments].filter((s) => s.minutes > 0).sort((a, b) => b.minutes - a.minutes)
  return (
    <div
      className="fixed z-[100] pointer-events-none bg-bg2 border border-bdr/10 rounded-xl shadow-2xl p-3 space-y-2"
      style={{ left: x, top: y - 8, width: 220, transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-tx1">{data.label}</p>
        <p className="text-xs text-tx3">{formatHours(data.total)}</p>
      </div>
      {nonZero.length === 0 ? (
        <p className="text-xs text-tx3">Sem cartões neste mês</p>
      ) : (
        <div className="space-y-1">
          {nonZero.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-tx2 truncate">{s.name}</span>
              </div>
              <span className="text-xs text-tx3 shrink-0">{formatHours(s.minutes)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
