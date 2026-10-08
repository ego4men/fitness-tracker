import { db, newId } from '../../db/db'
import type { Fast } from '../../db/types'

export const FAST_PRESETS = [12, 14, 16, 18, 20] as const

export async function isFastingEnabled(): Promise<boolean> {
  return ((await db.settings.get('fastingEnabled'))?.value as boolean | undefined) ?? false
}

export async function setFastingEnabled(on: boolean) {
  await db.settings.put({ key: 'fastingEnabled', value: on })
}

export async function activeFast(): Promise<Fast | null> {
  const last = await db.fasts.orderBy('startedAt').last()
  return last && last.endedAt == null ? last : null
}

export async function startFast(targetHours: number, startedAt = Date.now()) {
  if (await activeFast()) return
  await db.fasts.add({ id: newId(), startedAt, endedAt: null, targetHours })
}

export async function endFast(id: string, endedAt = Date.now()) {
  await db.fasts.update(id, { endedAt })
}

/** "15 h 42 min" */
export function formatHours(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}
