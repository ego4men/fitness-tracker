import { useCallback, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BackLink, Button, Card, Page } from '../../components/ui'
import type { Food, Meal } from '../../db/types'
import { toISODate } from '../../lib/date'
import { AmountSheet, MealPicker } from './AmountSheet'
import { BarcodeScanner } from './BarcodeScanner'
import { findByBarcode, logFood, MEALS, mealForHour, mealLabel, quickAdd } from './foods'
import { FoodSearch } from './FoodSearch'
import { fetchOffByBarcode } from './off'

type Tab = 'search' | 'scan' | 'quick'

export function AddFoodPage() {
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const meal = (MEALS.some((m) => m.id === params.meal) ? params.meal : mealForHour()) as Meal
  const date = search.get('fecha') ?? toISODate()
  const [tab, setTab] = useState<Tab>((search.get('modo') as Tab) || 'search')
  const [selected, setSelected] = useState<Food | null>(null)

  const back = () => navigate(date === toISODate() ? '/nutricion' : `/nutricion?fecha=${date}`, { replace: true })

  const onConfirm = async (grams: number, m: Meal) => {
    if (!selected) return
    await logFood(date, m, selected, grams)
    back()
  }

  return (
    <Page title={`Añadir a ${mealLabel(meal)}`} back={<BackLink to={-1} label="Comida" />}>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
        {(
          [
            ['search', 'Buscar'],
            ['scan', 'Escanear'],
            ['quick', 'Rápido'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-h-10 rounded-lg text-sm font-semibold ${tab === id ? 'bg-surface-2 text-text' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' && <FoodSearch onSelect={setSelected} />}
      {tab === 'scan' && <ScanTab onFound={setSelected} meal={meal} date={date} />}
      {tab === 'quick' && <QuickAddForm meal={meal} onSave={async (m, name, macros) => { await quickAdd(date, m, name, macros); back() }} />}

      {selected && <AmountSheet food={selected} meal={meal} onConfirm={onConfirm} onClose={() => setSelected(null)} />}
    </Page>
  )
}

function ScanTab({ onFound, meal, date }: { onFound: (f: Food) => void; meal: Meal; date: string }) {
  const navigate = useNavigate()
  const [state, setState] = useState<{ kind: 'scanning' } | { kind: 'loading'; code: string } | { kind: 'missing' | 'error'; code: string; msg?: string }>({
    kind: 'scanning',
  })

  const onDetected = useCallback(
    async (code: string) => {
      setState({ kind: 'loading', code })
      try {
        const local = await findByBarcode(code)
        const food = local ?? (await fetchOffByBarcode(code))
        if (food) {
          onFound(food)
          setState({ kind: 'scanning' })
        } else setState({ kind: 'missing', code })
      } catch (e) {
        setState({ kind: 'error', code, msg: navigator.onLine ? (e instanceof Error ? e.message : String(e)) : 'Sin conexión a internet.' })
      }
    },
    [onFound],
  )

  if (state.kind === 'scanning') return <BarcodeScanner onDetected={onDetected} />
  if (state.kind === 'loading') return <p className="py-10 text-center text-muted">Buscando {state.code}…</p>

  return (
    <Card>
      <p className="mb-1 font-semibold">{state.kind === 'missing' ? 'Producto no encontrado' : 'No se pudo buscar'}</p>
      <p className="mb-4 text-sm text-muted">
        {state.kind === 'missing'
          ? `El código ${state.code} no está en Open Food Facts (o no tiene datos nutricionales). Puedes crearlo con los datos de la etiqueta.`
          : state.msg}
      </p>
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          onClick={() => navigate(`/nutricion/alimento/nuevo?codigo=${state.code}&comida=${meal}&fecha=${date}`)}
        >
          Crear alimento con este código
        </Button>
        <Button onClick={() => setState({ kind: 'scanning' })}>Escanear otro</Button>
      </div>
    </Card>
  )
}

function QuickAddForm({ meal: initial, onSave }: { meal: Meal; onSave: (m: Meal, name: string, macros: { kcal: number; protein: number; carbs: number; fat: number }) => void }) {
  const [meal, setMeal] = useState(initial)
  const [name, setName] = useState('')
  const [v, setV] = useState({ kcal: '', protein: '', carbs: '', fat: '' })
  const n = (s: string) => Math.max(0, Number(s.replace(',', '.')) || 0)
  const macros = { kcal: n(v.kcal), protein: n(v.protein), carbs: n(v.carbs), fat: n(v.fat) }
  // Si no escribe kcal, se calculan de los macros (4/4/9).
  const kcal = macros.kcal || Math.round(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)
  const field = 'min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-lg tabular-nums focus:border-accent focus:outline-none'

  return (
    <Card>
      <p className="mb-3 text-sm text-muted">Para cuando comes fuera y solo sabes las calorías (o una estimación).</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Descripción (opcional)" className={`${field} mb-3 text-base`} />
      <div className="mb-3 grid grid-cols-4 gap-2">
        {(
          [
            ['kcal', 'kcal'],
            ['protein', 'Prot. g'],
            ['carbs', 'Carb. g'],
            ['fat', 'Grasa g'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="text-xs text-muted">
            {label}
            <input inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={`${field} mt-1 text-center`} />
          </label>
        ))}
      </div>
      <MealPicker value={meal} onChange={setMeal} />
      <Button variant="primary" className="mt-3 w-full" disabled={kcal <= 0} onClick={() => onSave(meal, name, { ...macros, kcal })}>
        Añadir {kcal > 0 ? `${kcal} kcal` : ''}
      </Button>
    </Card>
  )
}
