import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Page } from '../../components/ui'
import { db } from '../../db/db'
import type { DiaryEntry } from '../../db/types'
import { formatLongDate, toISODate } from '../../lib/date'
import { WaterCard } from '../today/WaterCard'
import { EntrySheet } from './EntrySheet'
import { getGoals, getProfile, MEALS, totals } from './foods'
import { MacroSummary } from './MacroSummary'

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}

function dateLabel(iso: string): string {
  const today = toISODate()
  if (iso === today) return 'Hoy'
  if (iso === shiftDate(today, -1)) return 'Ayer'
  const [y, m, d] = iso.split('-').map(Number)
  return formatLongDate(new Date(y, m - 1, d))
}

export function NutritionPage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('fecha') ?? toISODate()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<DiaryEntry | null>(null)

  const data = useLiveQuery(async () => {
    const [profile, goals, entries] = await Promise.all([getProfile(), getGoals(), db.diary.where('date').equals(date).sortBy('createdAt')])
    return { profile, goals, entries }
  }, [date])

  if (!data) return null
  if (!data.profile || !data.goals) return <Navigate to="/nutricion/perfil" replace />
  const { goals, entries } = data
  const isToday = date === toISODate()

  const setDate = (d: string) => setParams(d === toISODate() ? {} : { fecha: d }, { replace: true })

  return (
    <Page
      title="Comida"
      action={
        <Link to="/nutricion/perfil" className="min-h-11 px-2 py-2 text-sm text-accent">
          Metas
        </Link>
      }
    >
      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface">
        <button onClick={() => setDate(shiftDate(date, -1))} className="min-h-11 w-12 text-xl text-muted" aria-label="Día anterior">
          ‹
        </button>
        <button onClick={() => setDate(toISODate())} className="font-semibold">
          {dateLabel(date)}
        </button>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={isToday} className="min-h-11 w-12 text-xl text-muted disabled:opacity-30" aria-label="Día siguiente">
          ›
        </button>
      </div>

      <Card>
        <MacroSummary consumed={totals(entries)} goals={goals} />
      </Card>

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal.id)
        const kcal = Math.round(totals(items).kcal)
        return (
          <section key={meal.id} className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between px-4 pt-3">
              <h2 className="font-semibold">
                {meal.label} {kcal > 0 && <span className="text-sm font-normal text-muted">· {kcal} kcal</span>}
              </h2>
              <button
                onClick={() => navigate(`/nutricion/agregar/${meal.id}?fecha=${date}`)}
                className="min-h-11 px-2 text-sm font-semibold text-accent"
              >
                + Añadir
              </button>
            </div>
            {items.length > 0 && (
              <ul className="divide-y divide-line px-4 pb-1">
                {items.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditing(e)} className="flex w-full items-center gap-3 py-2.5 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{e.name}</p>
                        <p className="text-xs text-muted">
                          {e.grams != null && `${e.grams} g · `}P {Math.round(e.protein)} · C {Math.round(e.carbs)} · G {Math.round(e.fat)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{Math.round(e.kcal)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!items.length && <div className="h-2" />}
          </section>
        )
      })}

      {isToday && <WaterCard goalMl={goals.waterMl} />}

      <Link to="/nutricion/mis-alimentos" className="rounded-2xl border border-line bg-surface p-4 font-semibold active:bg-surface-2">
        🥗 Mis alimentos y recetas
      </Link>

      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
