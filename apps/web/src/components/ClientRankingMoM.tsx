/**
 * N1: Ranking de clientes con variación mes contra mes (MoM).
 * Top 5 clientes por horas de PROYECTO (work_type='project') del mes en curso,
 * comparadas contra el mes calendario anterior. Métrica de EQUIPO: recibe
 * `records` SIN filtrar, así el ranking no depende de los filtros del panel.
 */

import React, { useMemo } from 'react'
import { TimeRecord } from '../types'

interface ClientRankingMoMProps {
  records: TimeRecord[]
}

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Etiqueta corta para una clave YYYY-MM → "Jul 2026" (misma convención que el Dashboard).
const fmtMonthKey = (key: string): string => {
  const [yy, mm] = (key || '').split('-')
  const idx = parseInt(mm, 10) - 1
  return idx >= 0 && idx < 12 ? `${MONTH_ABBR[idx]} ${yy}` : key
}

interface RankingRow {
  name: string
  current: number
  previous: number
  // null => cliente "nuevo": sin horas de proyecto el mes anterior (previous 0)
  deltaPct: number | null
}

const BAR_COLORS = ['#1a5f7a', '#f97316', '#10b981', '#0ea5e9', '#8b5cf6']

export const ClientRankingMoM: React.FC<ClientRankingMoMProps> = ({ records }) => {
  const { curKey, prevKey, rows, maxHours } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const mo = now.getMonth() // 0-based
    const curKey = `${y}-${String(mo + 1).padStart(2, '0')}`
    const prevDate = new Date(y, mo - 1, 1) // Date normaliza el cruce de año
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const cur = new Map<string, number>()
    const prev = new Map<string, number>()
    for (const r of records) {
      if (r.work_type !== 'project') continue // solo carga de clientes
      const name = (r.client_name || '').trim()
      if (!name) continue
      const m = (r.date || '').slice(0, 7)
      const hrs = r.duration_decimal || 0
      if (m === curKey) cur.set(name, (cur.get(name) || 0) + hrs)
      else if (m === prevKey) prev.set(name, (prev.get(name) || 0) + hrs)
    }

    const rows: RankingRow[] = Array.from(cur.entries())
      .map(([name, current]) => {
        const previous = prev.get(name) || 0
        return {
          name,
          current,
          previous,
          deltaPct: previous > 0 ? ((current - previous) / previous) * 100 : null,
        }
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 5)

    const maxHours = rows.length > 0 ? rows[0].current : 0
    return { curKey, prevKey, rows, maxHours }
  }, [records])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="text-lg font-semibold text-[#1a5f7a] dark:text-sky-300">
          🏆 Ranking de Clientes — {fmtMonthKey(curKey)}
        </h3>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">vs {fmtMonthKey(prevKey)}</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
        Top 5 por horas de proyecto del mes en curso · métrica de equipo (no responde a los filtros)
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Sin horas de proyecto registradas en {fmtMonthKey(curKey)}
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => (
            <div key={row.name}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500">{idx + 1}.</span>
                  <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200" title={row.name}>
                    {row.name}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{row.current.toFixed(1)}h</span>
                  <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
                    mes ant.: {row.previous.toFixed(1)}h
                  </span>
                  {row.deltaPct === null ? (
                    <span
                      className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                      title="Sin horas de proyecto el mes anterior"
                    >
                      nuevo
                    </span>
                  ) : row.deltaPct > 0 ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ▲ {row.deltaPct.toFixed(1)}%
                    </span>
                  ) : row.deltaPct < 0 ? (
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                      ▼ {Math.abs(row.deltaPct).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">— 0.0%</span>
                  )}
                </div>
              </div>
              {/* Barra horizontal proporcional al cliente líder del mes */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${maxHours > 0 ? Math.max(2, (row.current / maxHours) * 100) : 0}%`,
                    backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
