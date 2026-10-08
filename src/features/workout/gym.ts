import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { GymSettings } from '../../db/types'

export const DEFAULT_GYM: GymSettings = { barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] }
export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5]

export async function getGym(): Promise<GymSettings> {
  return ((await db.settings.get('gym'))?.value as GymSettings | undefined) ?? DEFAULT_GYM
}

export function useGym(): GymSettings {
  return useLiveQuery(getGym, []) ?? DEFAULT_GYM
}

export async function saveGym(gym: GymSettings) {
  await db.settings.put({ key: 'gym', value: gym })
}
