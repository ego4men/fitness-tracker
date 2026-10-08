import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { confirmDialog } from '../../components/dialog'
import { Button, Card } from '../../components/ui'
import { db } from '../../db/db'
import { isFastingEnabled, setFastingEnabled } from '../nutrition/fasting'
import { ALL_PLATES, saveGym, useGym } from '../workout/gym'
import { buildICS, WEEKDAYS, type Reminder, type Weekday } from './reminders'

export function GymCard() {
  const gym = useGym()
  return (
    <Card title="Barra y discos">
      <p className="mb-2 text-sm text-muted">Para la calculadora de discos y las series de calentamiento.</p>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm">Barra</span>
        {[20, 15, 10].map((kg) => (
          <button
            key={kg}
            onClick={() => saveGym({ ...gym, barKg: kg })}
            className={`min-h-9 rounded-full border px-3 text-sm ${gym.barKg === kg ? 'border-accent text-accent' : 'border-line text-muted'}`}
          >
            {kg} kg
          </button>
        ))}
      </div>
      <p className="mb-2 text-sm">Discos disponibles (kg)</p>
      <div className="flex flex-wrap gap-2">
        {ALL_PLATES.map((p) => {
          const on = gym.plates.includes(p)
          return (
            <button
              key={p}
              onClick={() => saveGym({ ...gym, plates: on ? gym.plates.filter((x) => x !== p) : [...gym.plates, p].sort((a, b) => b - a) })}
              className={`min-h-9 min-w-12 rounded-full border px-3 text-sm tabular-nums ${on ? 'border-accent bg-accent/10 text-text' : 'border-line text-muted'}`}
            >
              {String(p).replace('.', ',')}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

export function FastingToggleCard() {
  const enabled = useLiveQuery(isFastingEnabled, [])
  const toggle = async () => {
    if (!enabled) {
      const ok = await confirmDialog({
        title: 'Activar ayuno intermitente',
        message:
          'Es una herramienta opcional. No la uses si tienes o tuviste un trastorno de la conducta alimentaria, diabetes con medicación, embarazo o lactancia, o si te lo desaconsejó un profesional de salud.',
        confirmText: 'Activar',
      })
      if (!ok) return
    }
    await setFastingEnabled(!enabled)
  }
  return (
    <Card title="Ayuno intermitente">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Temporizador de ayuno (16:8, 18:6…) en la pantalla de Comida.</p>
        <Button onClick={toggle}>{enabled ? 'Desactivar' : 'Activar'}</Button>
      </div>
    </Card>
  )
}

type Draft = { on: boolean; time: string; days: Weekday[] }

export function RemindersCard() {
  const saved = useLiveQuery(async () => (await db.settings.get('reminders'))?.value as Record<string, Draft> | undefined, [])
  const [draft, setDraft] = useState<Record<string, Draft> | null>(null)
  const [status, setStatus] = useState('')
  const appUrl = location.origin + location.pathname

  const defs = [
    { id: 'peso', title: 'Pésate (en ayunas)', label: 'Pesarme', def: { on: true, time: '07:30', days: [] as Weekday[] } },
    { id: 'entreno', title: 'Hoy toca entrenar 💪', label: 'Entrenar', def: { on: true, time: '18:00', days: ['MO', 'TU', 'TH', 'FR'] as Weekday[] } },
    { id: 'comida', title: 'Registra tus comidas de hoy', label: 'Registrar comida', def: { on: true, time: '21:00', days: [] as Weekday[] } },
  ]
  const values = draft ?? Object.fromEntries(defs.map((d) => [d.id, saved?.[d.id] ?? d.def]))
  const set = (id: string, patch: Partial<Draft>) => setDraft({ ...values, [id]: { ...values[id], ...patch } })

  const onExport = async () => {
    await db.settings.put({ key: 'reminders', value: values })
    const reminders: Reminder[] = defs
      .filter((d) => values[d.id].on)
      .map((d) => ({ id: d.id, title: d.title, time: values[d.id].time, days: values[d.id].days, url: appUrl }))
    if (!reminders.length) return setStatus('Activa al menos un recordatorio.')
    const file = new File([buildICS(reminders)], 'recordatorios-fitness.ics', { type: 'text/calendar' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        setStatus('Elige “Calendario” (o guarda el archivo y ábrelo desde Archivos).')
      } catch {
        /* cancelado */
      }
      return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setStatus('Archivo descargado: ábrelo para añadirlo a tu calendario.')
  }

  return (
    <Card title="Recordatorios">
      <p className="mb-3 text-sm text-muted">
        Se añaden a la app Calendario de tu iPhone con alarma. (Una app web no puede enviar notificaciones programadas sin un servidor.)
      </p>
      <div className="flex flex-col gap-3">
        {defs.map((d) => {
          const v = values[d.id]
          return (
            <div key={d.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={v.on} onChange={(e) => set(d.id, { on: e.target.checked })} className="h-5 w-5 accent-[var(--color-accent)]" />
                  {d.label}
                </label>
                <input
                  type="time"
                  value={v.time}
                  onChange={(e) => set(d.id, { time: e.target.value })}
                  className="min-h-10 rounded-lg border border-line bg-surface-2 px-2 tabular-nums"
                />
              </div>
              {v.on && (
                <div className="mt-2 flex gap-1">
                  {WEEKDAYS.map((w) => {
                    const all = v.days.length === 0
                    const on = all || v.days.includes(w.id)
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          const current = all ? WEEKDAYS.map((x) => x.id) : v.days
                          const next = on ? current.filter((x) => x !== w.id) : [...current, w.id]
                          set(d.id, { days: next.length === 7 ? [] : next })
                        }}
                        className={`h-9 flex-1 rounded-lg text-xs font-semibold ${on ? 'bg-surface-2 text-text' : 'text-muted opacity-50'}`}
                      >
                        {w.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="primary" className="mt-3 w-full" onClick={onExport}>
        Añadir al Calendario
      </Button>
      {status && <p className="mt-2 text-sm text-muted">{status}</p>}
      <p className="mt-2 text-xs text-muted">Si cambias algo, vuelve a añadirlos y borra los anteriores en Calendario.</p>
    </Card>
  )
}
