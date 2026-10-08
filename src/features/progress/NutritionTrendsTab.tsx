import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DailyBarChart, DataTable } from '../../components/charts'
import { Card } from '../../components/ui'
import { db } from '../../db/db'
import { toISODate } from '../../lib/date'
import { getGoals, totals } from '../nutrition/foods'
import { RangePicker } from './BodyTab'
import { addDays, type Point } from './stats'
import { Stat } from './StrengthTab'

const OPTIONS = [
  { days: 7, label: '7 d' },
  { days: 30, label: '30 d' },
  { days: 90, label: '90 d' },
] as const

export function NutritionTrendsTab() {
  const [range, setRange] = useState(7)
  const data = useLiveQuery(async () => {
    const today = toISODate()
    const from = addDays(today, -(range - 1))
    const entries = await db.diary.where('date').between(from, today, true, true).toArray()
    const days = Array.from({ length: range }, (_, i) => addDays(from, i))
    const perDay = days.map((d) => ({ date: d, ...totals(entries.filter((e) => e.date === d)) }))
    return { goals: await getGoals(), perDay }
  }, [range])

  if (!data) return null
  const { goals, perDay } = data
  const logged = perDay.filter((d) => d.kcal > 0)

  if (!goals) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Configura tus metas en <Link to="/nutricion" className="text-accent">Comida</Link> para ver tus tendencias.
        </p>
      </Card>
    )
  }

  // Promedios solo sobre días registrados (un día sin registrar no es un día de 0 kcal).
  const avg = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (logged.length ? logged.reduce((s, d) => s + d[k], 0) / logged.length : 0)
  const kcal: Point[] = perDay.map((d) => ({ date: d.date, value: Math.round(d.kcal) }))
  const protein: Point[] = perDay.map((d) => ({ date: d.date, value: Math.round(d.protein) }))
  const macroKcal = { protein: avg('protein') * 4, carbs: avg('carbs') * 4, fat: avg('fat') * 9 }
  const macroTotal = macroKcal.protein + macroKcal.carbs + macroKcal.fat || 1

  return (
    <>
      <RangePicker value={range} onChange={setRange} options={OPTIONS} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Kcal promedio" value={logged.length ? `${Math.round(avg('kcal'))}` : '—'} />
        <Stat label="Proteína prom." value={logged.length ? `${Math.round(avg('protein'))} g` : '—'} />
        <Stat label="Días registrados" value={`${logged.length}/${range}`} />
      </div>

      <Card title={`Calorías por día · meta ${goals.kcal}`}>
        <DailyBarChart data={kcal} color="var(--color-series)" unit="kcal" reference={{ value: goals.kcal, label: `Meta ${goals.kcal}` }} />
        <DataTable rows={kcal.filter((p) => p.value > 0)} unit="kcal" />
      </Card>

      <Card title={`Proteína por día · meta ${goals.protein} g`}>
        <DailyBarChart data={protein} color="var(--color-protein)" unit="g" reference={{ value: goals.protein, label: `Meta ${goals.protein} g` }} />
      </Card>

      {logged.length > 0 && (
        <Card title="Reparto promedio de calorías">
          <div className="mb-3 flex h-3 overflow-hidden rounded-full">
            {(['protein', 'carbs', 'fat'] as const).map((k, i) => (
              <div
                key={k}
                style={{ width: `${(macroKcal[k] / macroTotal) * 100}%`, background: `var(--color-${k})`, marginLeft: i ? 2 : 0 }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            {(
              [
                ['protein', 'Proteína'],
                ['carbs', 'Carbohidratos'],
                ['fat', 'Grasa'],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: `var(--color-${k})` }} />
                <span className="text-muted">{label}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {Math.round((macroKcal[k] / macroTotal) * 100)} %
                  <span className="ml-2 font-normal text-muted">{Math.round(avg(k))} g/día</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
