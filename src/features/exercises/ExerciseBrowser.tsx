import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/db'
import type { Exercise } from '../../db/types'
import { exerciseImageUrl, matchesQuery, sortExercises } from './catalog'
import { equipmentLabel, MUSCLE_LABELS, muscleLabel } from './labels'

const PAGE = 60
const MUSCLES = Object.keys(MUSCLE_LABELS)

export function ExerciseThumb({ exercise, size = 48 }: { exercise: Exercise; size?: number }) {
  const src = exercise.images[0]
  return (
    <div className="shrink-0 overflow-hidden rounded-lg bg-white" style={{ width: size, height: size }}>
      {src && <img src={exerciseImageUrl(src)} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </div>
  )
}

/** Buscador del catálogo con filtro por músculo. Reutilizado por la pantalla y el selector. */
export function ExerciseBrowser({ onSelect, autoFocus }: { onSelect: (e: Exercise) => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const all = useLiveQuery(() => db.exercises.toArray(), [])

  const results = useMemo(() => {
    if (!all) return []
    const filtered = all.filter((e) => (!muscle || e.primaryMuscles.includes(muscle)) && matchesQuery(e, query))
    return sortExercises(filtered)
  }, [all, query, muscle])

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setLimit(PAGE)
        }}
        placeholder="Buscar: press banca, sentadilla, curl…"
        className="min-h-11 w-full rounded-xl border border-line bg-surface-2 px-4 placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[null, ...MUSCLES].map((m) => (
          <button
            key={m ?? 'all'}
            onClick={() => {
              setMuscle(m)
              setLimit(PAGE)
            }}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${
              muscle === m ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted'
            }`}
          >
            {m ? muscleLabel(m) : 'Todos'}
          </button>
        ))}
      </div>

      {!all ? (
        <p className="py-8 text-center text-sm text-muted">Cargando ejercicios…</p>
      ) : results.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Sin resultados.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {results.slice(0, limit).map((e) => (
            <li key={e.id}>
              <button onClick={() => onSelect(e)} className="flex w-full items-center gap-3 p-3 text-left active:bg-surface-2">
                <ExerciseThumb exercise={e} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="truncate text-xs text-muted">
                    {e.primaryMuscles.map(muscleLabel).join(', ')} · {equipmentLabel(e.equipment)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.length > limit && (
        <button onClick={() => setLimit((l) => l + PAGE)} className="min-h-11 text-sm text-accent">
          Ver más ({results.length - limit})
        </button>
      )}
    </div>
  )
}

/** Selector a pantalla completa (para añadir a una rutina o al entreno). */
export function ExercisePicker({ onSelect, onClose }: { onSelect: (e: Exercise) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="pt-safe pb-safe mx-auto max-w-lg px-4">
        <div className="flex items-center justify-between py-3">
          <h2 className="text-xl font-bold">Añadir ejercicio</h2>
          <button onClick={onClose} className="min-h-11 px-2 text-accent">
            Cerrar
          </button>
        </div>
        <ExerciseBrowser onSelect={onSelect} />
      </div>
    </div>
  )
}
