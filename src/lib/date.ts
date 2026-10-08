import type { ISODate } from '../db/types'

/** Fecha local (no UTC) en formato YYYY-MM-DD. */
export function toISODate(d: Date = new Date()): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatLongDate(d: Date = new Date()): string {
  const s = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
