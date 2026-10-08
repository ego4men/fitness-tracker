import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { DataTable, LineChart } from '../../components/charts'
import { confirmDialog } from '../../components/dialog'
import { Sheet } from '../../components/Sheet'
import { Button, Card } from '../../components/ui'
import { db, newId } from '../../db/db'
import type { MeasurementKind, ProgressPhoto } from '../../db/types'
import { toISODate } from '../../lib/date'
import { logWeight } from '../nutrition/foods'
import { addDays, movingAverage, shortDate, weeklyRate, type Point } from './stats'

export const RANGES = [
  { days: 30, label: '30 d' },
  { days: 90, label: '90 d' },
  { days: 365, label: '1 año' },
  { days: 0, label: 'Todo' },
] as const

export function RangePicker({ value, onChange, options = RANGES }: { value: number; onChange: (d: number) => void; options?: readonly { days: number; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface p-1">
      {options.map((r) => (
        <button
          key={r.days}
          onClick={() => onChange(r.days)}
          className={`min-h-9 flex-1 rounded-lg text-sm font-semibold ${value === r.days ? 'bg-surface-2 text-text' : 'text-muted'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

const inRange = (p: { date: string }, days: number) => days === 0 || p.date >= addDays(toISODate(), -days)
const kg = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString('es')} kg`

export function BodyTab() {
  const [range, setRange] = useState(90)
  return (
    <>
      <RangePicker value={range} onChange={setRange} />
      <WeightCard range={range} />
      <MeasurementsCard range={range} />
      <PhotosCard />
    </>
  )
}

function WeightCard({ range }: { range: number }) {
  const body = useLiveQuery(() => db.body.orderBy('date').toArray(), [])
  const [input, setInput] = useState('')
  if (!body) return null

  const points: Point[] = body.map((b) => ({ date: b.date, value: b.weightKg }))
  const shown = points.filter((p) => inRange(p, range))
  const avg = movingAverage(points).filter((p) => inRange(p, range))
  const latest = points.at(-1)
  const monthAgo = [...points].reverse().find((p) => p.date <= addDays(toISODate(), -30))
  const rate = weeklyRate(points)
  const today = points.find((p) => p.date === toISODate())

  const save = async () => {
    const n = Number(input.replace(',', '.'))
    if (n >= 30 && n <= 300) {
      await logWeight(n)
      setInput('')
    }
  }

  return (
    <Card title="Peso">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold">{latest ? kg(latest.value) : '—'}</p>
          <p className="text-xs text-muted">
            {latest ? `Último: ${shortDate(latest.date)}` : 'Sin registros todavía'}
            {latest && monthAgo && ` · ${latest.value - monthAgo.value >= 0 ? '+' : ''}${kg(latest.value - monthAgo.value)} en 30 días`}
          </p>
          {rate != null && (
            <p className="text-xs text-muted">
              Ritmo: {rate >= 0 ? '+' : ''}
              {kg(rate)}/semana
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={today ? String(today.value) : 'kg hoy'}
            className="min-h-11 w-20 rounded-xl border border-line bg-surface-2 px-2 text-center tabular-nums focus:border-accent focus:outline-none"
          />
          <Button variant="primary" onClick={save} disabled={!input}>
            {today ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </div>
      {shown.length > 0 ? (
        <>
          <LineChart
            unit="kg"
            series={[
              { label: 'Registros', color: 'var(--color-series-soft)', points: shown, kind: 'dots' },
              { label: 'Media 7 días', color: 'var(--color-series)', points: avg, kind: 'line' },
            ]}
          />
          <DataTable rows={shown} unit="kg" />
        </>
      ) : (
        <p className="text-sm text-muted">Pésate por la mañana, en ayunas, para comparar mejor día a día.</p>
      )}
    </Card>
  )
}

export const MEASURES: { kind: MeasurementKind; label: string; unit: string }[] = [
  { kind: 'waist', label: 'Cintura', unit: 'cm' },
  { kind: 'chest', label: 'Pecho', unit: 'cm' },
  { kind: 'arm', label: 'Brazo', unit: 'cm' },
  { kind: 'hip', label: 'Cadera', unit: 'cm' },
  { kind: 'thigh', label: 'Muslo', unit: 'cm' },
  { kind: 'neck', label: 'Cuello', unit: 'cm' },
  { kind: 'bodyfat', label: '% grasa', unit: '%' },
]

function MeasurementsCard({ range }: { range: number }) {
  const all = useLiveQuery(() => db.measurements.orderBy('date').toArray(), [])
  const [selected, setSelected] = useState<MeasurementKind>('waist')
  const [editing, setEditing] = useState(false)
  if (!all) return null

  const byKind = (k: MeasurementKind) => all.filter((m) => m.kind === k)
  const sel = MEASURES.find((m) => m.kind === selected)!
  const selPoints = byKind(selected).map((m) => ({ date: m.date, value: m.value })).filter((p) => inRange(p, range))

  return (
    <Card
      title="Medidas"
      action={
        <button onClick={() => setEditing(true)} className="min-h-11 px-2 text-sm font-semibold text-accent">
          + Registrar
        </button>
      }
    >
      {all.length === 0 ? (
        <p className="text-sm text-muted">Mide cintura, pecho, brazo… una vez cada 2–4 semanas. La cinta mide lo que la báscula no.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {MEASURES.map((m) => {
              const list = byKind(m.kind)
              const last = list.at(-1)
              const diff = last && list.length > 1 ? last.value - list[0].value : null
              return (
                <button
                  key={m.kind}
                  onClick={() => setSelected(m.kind)}
                  className={`rounded-xl border p-2 text-left ${selected === m.kind ? 'border-accent' : 'border-line'} ${last ? '' : 'opacity-50'}`}
                >
                  <p className="text-[11px] text-muted">{m.label}</p>
                  <p className="font-semibold tabular-nums">{last ? last.value : '—'}</p>
                  {diff != null && diff !== 0 && (
                    <p className="text-[11px] text-muted tabular-nums">
                      {diff > 0 ? '+' : ''}
                      {Math.round(diff * 10) / 10}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
          {selPoints.length > 1 ? (
            <LineChart unit={sel.unit} height={150} series={[{ label: sel.label, color: 'var(--color-series)', points: selPoints, kind: 'line' }]} />
          ) : (
            <p className="text-xs text-muted">Con dos o más registros de {sel.label.toLowerCase()} verás su gráfica.</p>
          )}
        </>
      )}
      {editing && <MeasureSheet onClose={() => setEditing(false)} />}
    </Card>
  )
}

function MeasureSheet({ onClose }: { onClose: () => void }) {
  const today = toISODate()
  const [values, setValues] = useState<Record<string, string>>({})
  const save = async () => {
    await db.transaction('rw', db.measurements, async () => {
      for (const m of MEASURES) {
        const v = Number((values[m.kind] ?? '').replace(',', '.'))
        if (!v || v <= 0) continue
        const existing = await db.measurements.where('[kind+date]').equals([m.kind, today]).first()
        if (existing) await db.measurements.update(existing.id, { value: v })
        else await db.measurements.add({ id: newId(), date: today, kind: m.kind, value: v })
      }
    })
    onClose()
  }
  return (
    <Sheet title="Medidas de hoy" onClose={onClose}>
      <p className="text-sm text-muted">Rellena solo las que midas. Mide siempre en el mismo punto y sin apretar la cinta.</p>
      <div className="grid grid-cols-2 gap-2">
        {MEASURES.map((m) => (
          <label key={m.kind} className="text-xs text-muted">
            {m.label} ({m.unit})
            <input
              inputMode="decimal"
              value={values[m.kind] ?? ''}
              onChange={(e) => setValues({ ...values, [m.kind]: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-lg tabular-nums focus:border-accent focus:outline-none"
            />
          </label>
        ))}
      </div>
      <Button variant="primary" onClick={save}>
        Guardar
      </Button>
    </Sheet>
  )
}

/** Reduce la foto a ≤1080 px en JPEG (unos 150–300 KB) para que quepa bien en el respaldo. */
async function compressImage(file: File, max = 1080, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function PhotosCard() {
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), [])
  const fileInput = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null)
  const [comparing, setComparing] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (file: File) => {
    setBusy(true)
    try {
      const dataUrl = await compressImage(file)
      await db.photos.add({ id: newId(), date: toISODate(), dataUrl, note: '', createdAt: Date.now() })
    } finally {
      setBusy(false)
    }
  }

  const onTap = (p: ProgressPhoto) => {
    if (!comparing) return setViewing(p)
    const next = comparing.includes(p.id) ? comparing.filter((x) => x !== p.id) : [...comparing, p.id].slice(-2)
    setComparing(next)
  }

  const pair = comparing?.length === 2 ? comparing.map((id) => photos?.find((p) => p.id === id)!).sort((a, b) => a.date.localeCompare(b.date)) : null

  return (
    <Card
      title="Fotos"
      action={
        <div className="flex">
          {photos && photos.length >= 2 && (
            <button onClick={() => setComparing(comparing ? null : [])} className="min-h-11 px-2 text-sm text-muted">
              {comparing ? 'Cancelar' : 'Comparar'}
            </button>
          )}
          <button onClick={() => fileInput.current?.click()} disabled={busy} className="min-h-11 px-2 text-sm font-semibold text-accent">
            {busy ? 'Guardando…' : '+ Foto'}
          </button>
        </div>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void onFile(f)
        }}
      />
      {comparing && <p className="mb-2 text-sm text-muted">Elige dos fotos ({comparing.length}/2).</p>}
      {!photos?.length ? (
        <p className="text-sm text-muted">Una foto cada 2–4 semanas, misma luz y misma pose. Solo se guardan en tu iPhone (y en tus respaldos).</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button key={p.id} onClick={() => onTap(p)} className={`relative overflow-hidden rounded-xl ${comparing?.includes(p.id) ? 'ring-2 ring-accent' : ''}`}>
              <img src={p.dataUrl} alt={`Foto del ${shortDate(p.date)}`} className="aspect-[3/4] w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[11px] text-white">{shortDate(p.date)}</span>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <Sheet title={new Date(viewing.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} onClose={() => setViewing(null)}>
          <img src={viewing.dataUrl} alt="" className="w-full rounded-xl" />
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirmDialog({ title: 'Borrar foto', confirmText: 'Borrar', danger: true })) {
                await db.photos.delete(viewing.id)
                setViewing(null)
              }
            }}
          >
            Borrar foto
          </Button>
        </Sheet>
      )}
      {pair && (
        <Sheet title="Comparación" onClose={() => setComparing(null)}>
          <div className="grid grid-cols-2 gap-2">
            {pair.map((p) => (
              <figure key={p.id}>
                <img src={p.dataUrl} alt="" className="w-full rounded-xl" />
                <figcaption className="mt-1 text-center text-sm text-muted">{shortDate(p.date)}</figcaption>
              </figure>
            ))}
          </div>
        </Sheet>
      )}
    </Card>
  )
}
