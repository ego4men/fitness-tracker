import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { db } from '../../db/db'
import type { Food } from '../../db/types'
import { searchLocal } from './foods'
import { searchOff } from './off'

const SOURCE_BADGE: Record<Food['source'], string> = {
  basic: 'Básico',
  off: 'Open Food Facts',
  custom: 'Propio',
  recipe: 'Receta',
}

export function FoodRow({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-3 text-left active:bg-surface-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{food.name}</p>
        <p className="truncate text-xs text-muted">
          {[food.brand, SOURCE_BADGE[food.source], food.servingName && food.servingG ? `${food.servingName} = ${food.servingG} g` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{Math.round(food.per100g.kcal)}</p>
        <p className="text-[11px] text-muted">kcal/100 g</p>
      </div>
    </button>
  )
}

/** Buscador: básicos + guardados al instante; Open Food Facts al pedirlo. */
export function FoodSearch({ onSelect, allowOnline = true }: { onSelect: (f: Food) => void; allowOnline?: boolean }) {
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState<{ query: string; results: Food[] } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const saved = useLiveQuery(() => db.foods.toArray(), [])

  const local = useMemo(() => searchLocal(saved ?? [], query).slice(0, 50), [saved, query])
  const showOnline = online && online.query === query.trim()

  const runOnline = async () => {
    const q = query.trim()
    if (q.length < 2) return
    abort.current?.abort()
    abort.current = new AbortController()
    setStatus('loading')
    try {
      const results = await searchOff(q, abort.current.signal)
      setOnline({ query: q, results })
      setStatus('idle')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(navigator.onLine ? (e instanceof Error ? e.message : String(e)) : 'Sin conexión a internet.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ;(document.activeElement as HTMLElement | null)?.blur()
          if (allowOnline) void runOnline()
        }}
      >
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar: huevo, arroz, yogur griego…"
          className="min-h-11 w-full rounded-xl border border-line bg-surface-2 px-4 placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </form>

      {!query && local.length > 0 && <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Recientes y propios</h3>}
      {local.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {local.map((f) => (
            <li key={f.id}>
              <FoodRow food={f} onClick={() => onSelect(f)} />
            </li>
          ))}
        </ul>
      )}
      {query && local.length === 0 && <p className="text-center text-sm text-muted">Nada en tus alimentos ni en los básicos.</p>}

      {allowOnline && query.trim().length >= 2 && !showOnline && (
        <button
          onClick={runOnline}
          disabled={status === 'loading'}
          className="min-h-11 rounded-xl border border-line bg-surface text-sm font-semibold text-accent disabled:opacity-60"
        >
          {status === 'loading' ? 'Buscando…' : `Buscar “${query.trim()}” en Open Food Facts`}
        </button>
      )}
      {status === 'error' && <p className="text-center text-sm text-danger">{error}</p>}

      {showOnline && (
        <>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Open Food Facts</h3>
          {online.results.length === 0 ? (
            <p className="text-center text-sm text-muted">Sin resultados con datos nutricionales.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {online.results.map((f) => (
                <li key={f.id}>
                  <FoodRow food={f} onClick={() => onSelect(f)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
