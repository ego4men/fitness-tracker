import { db } from '../../db/db'
import type { Exercise } from '../../db/types'

// Subir este número cuando cambie public/data/exercises.json.
export const CATALOG_VERSION = 1

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

export function exerciseImageUrl(path: string): string {
  return /^(https?:|data:|blob:)/.test(path) ? path : IMAGE_BASE + path
}

/** Carga el catálogo en IndexedDB la primera vez (o al cambiar de versión). */
export async function ensureCatalog(): Promise<void> {
  const current = (await db.settings.get('catalogVersion'))?.value
  if (current === CATALOG_VERSION) return
  const res = await fetch(`${import.meta.env.BASE_URL}data/exercises.json`)
  if (!res.ok) throw new Error(`No se pudo cargar el catálogo (${res.status})`)
  const list = (await res.json()) as Exercise[]
  await db.transaction('rw', db.exercises, db.settings, async () => {
    await db.exercises.bulkPut(list) // los ejercicios propios (custom) tienen otros ids y se conservan
    await db.settings.put({ key: 'catalogVersion', value: CATALOG_VERSION })
  })
}

/** Minúsculas sin acentos, para buscar "press banca" o "sentadilla". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesQuery(e: Exercise, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = normalize(`${e.name} ${e.nameEn}`)
  return words.every((w) => hay.includes(w))
}

/** Primero fuerza (lo usual en el gym), luego por nombre. */
export function sortExercises(list: Exercise[]): Exercise[] {
  const rank = (e: Exercise) => (e.category === 'strength' ? 0 : e.category === 'powerlifting' ? 1 : 2)
  return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'es'))
}
