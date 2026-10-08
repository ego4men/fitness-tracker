import type { FitnessDB } from '../../db/db'
import { toISODate } from '../../lib/date'

export const BACKUP_APP_ID = 'fitness-tracker'
export const BACKUP_FORMAT_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP_ID
  formatVersion: number
  schemaVersion: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

export async function createBackup(db: FitnessDB): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) tables[table.name] = await table.toArray()
  })
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const b = data as Partial<Backup>
  if (b?.app !== BACKUP_APP_ID || typeof b.tables !== 'object' || b.tables === null) {
    throw new Error('Este archivo no es un respaldo de Fitness Tracker.')
  }
  if ((b.formatVersion ?? 0) > BACKUP_FORMAT_VERSION) {
    throw new Error('El respaldo es de una versión más nueva de la app. Actualiza la app primero.')
  }
  for (const [name, rows] of Object.entries(b.tables)) {
    if (!Array.isArray(rows)) throw new Error(`Tabla "${name}" con formato inválido.`)
  }
  return b as Backup
}

/** Reemplaza todos los datos locales por los del respaldo (atómico). */
export async function restoreBackup(db: FitnessDB, backup: Backup): Promise<number> {
  let count = 0
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
      const rows = backup.tables[table.name]
      if (rows?.length) {
        await table.bulkPut(rows)
        count += rows.length
      }
    }
  })
  return count
}

export function backupFileName(date = new Date()): string {
  return `fitness-respaldo-${toISODate(date)}.json`
}

/**
 * En iPhone abre la hoja de compartir (Guardar en Archivos → iCloud Drive,
 * Google Drive, OneDrive…). En escritorio, descarga el archivo.
 */
export async function shareOrDownloadBackup(backup: Backup): Promise<'shared' | 'downloaded'> {
  const name = backupFileName()
  const file = new File([JSON.stringify(backup)], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name })
    return 'shared'
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
