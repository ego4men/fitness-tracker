import { useEffect, useRef, useState } from 'react'
import { Button, Card, Page } from '../../components/ui'
import { db } from '../../db/db'
import { estimateUsageMB, isPersisted, requestPersist } from '../../lib/storage'
import { createBackup, parseBackup, restoreBackup, shareOrDownloadBackup } from '../backup/backup'

type Status = { kind: 'ok' | 'error'; text: string } | null

export function SettingsPage() {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [usage, setUsage] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    isPersisted().then(setPersisted)
    estimateUsageMB().then(setUsage)
  }, [])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setStatus(null)
    try {
      setStatus({ kind: 'ok', text: await fn() })
    } catch (e) {
      // Cancelar la hoja de compartir no es un error.
      if (e instanceof DOMException && e.name === 'AbortError') return
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const onExport = () =>
    run(async () => {
      const how = await shareOrDownloadBackup(await createBackup(db))
      return how === 'shared' ? 'Respaldo listo para guardar.' : 'Respaldo descargado.'
    })

  const onImportFile = (file: File) =>
    run(async () => {
      const backup = parseBackup(await file.text())
      const when = new Date(backup.exportedAt).toLocaleString('es')
      if (!confirm(`Esto reemplazará TODOS tus datos actuales por el respaldo del ${when}. ¿Continuar?`)) {
        return 'Importación cancelada.'
      }
      const n = await restoreBackup(db, backup)
      return `Respaldo restaurado (${n} registros).`
    })

  const onPersist = async () => setPersisted(await requestPersist())

  return (
    <Page title="Ajustes">
      <Card title="Respaldo">
        <p className="mb-3 text-sm text-muted">
          Tus datos viven en este iPhone. Exporta un respaldo de vez en cuando y guárdalo en iCloud Drive, Google Drive u
          OneDrive (“Guardar en Archivos”).
        </p>
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" disabled={busy} onClick={onExport}>
            Exportar
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => fileInput.current?.click()}>
            Importar
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) onImportFile(f)
          }}
        />
        {status && (
          <p className={`mt-3 text-sm ${status.kind === 'ok' ? 'text-accent' : 'text-danger'}`}>{status.text}</p>
        )}
      </Card>

      <Card title="Almacenamiento">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Protección contra borrado</dt>
            <dd>{persisted == null ? '…' : persisted ? 'Activada' : 'No activada'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Espacio usado</dt>
            <dd className="tabular-nums">{usage == null ? '—' : `${usage.toFixed(2)} MB`}</dd>
          </div>
        </dl>
        {persisted === false && (
          <Button className="mt-3 w-full" onClick={onPersist}>
            Activar protección
          </Button>
        )}
      </Card>

      <p className="text-center text-xs text-muted">Fitness Tracker v{__APP_VERSION__}</p>
    </Page>
  )
}
