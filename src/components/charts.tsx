import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { ISODate } from '../db/types'
import { daysBetween, parseISO, shortDate, type Point } from '../features/progress/stats'

// Gráficas SVG ligeras. Especificaciones (skill dataviz): líneas 2px, marcadores
// ≥8px con anillo del color de fondo, barras ≤24px con extremo redondeado 4px y
// base recta, rejilla 1px recesiva, texto siempre en tokens de texto (nunca en
// el color de la serie), tooltip/cruceta por defecto, leyenda con ≥2 series.

const PAD = { top: 12, right: 12, bottom: 22, left: 40 }
const AXIS_TEXT = { fontSize: 11, fill: 'var(--color-muted)' }

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

/** 3–5 marcas "redondas" que cubren [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1
    max += 1
  }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

const fmt = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('es') : String(Math.round(n * 10) / 10))

export interface LineSeries {
  label: string
  color: string
  points: Point[]
  kind: 'line' | 'dots'
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 90, 0), width - 180)
  return (
    <div className="pointer-events-none absolute top-0 w-[180px] rounded-lg border border-line bg-bg/95 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg" style={{ left }}>
      {children}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; kind: 'line' | 'dots' | 'bar' }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.kind === 'line' ? (
            <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} />
          ) : i.kind === 'dots' ? (
            <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
          ) : (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Línea(s) en el tiempo con cruceta que se ajusta a la fecha más cercana. */
export function LineChart({ series, unit, height = 180 }: { series: LineSeries[]; unit: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<ISODate | null>(null)
  const all = series.flatMap((s) => s.points)
  if (all.length === 0) return null

  const dates = [...new Set(all.map((p) => p.date))].sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  const span = Math.max(1, daysBetween(first, last))
  const ticks = niceTicks(Math.min(...all.map((p) => p.value)), Math.max(...all.map((p) => p.value)))
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]]
  const iw = width - PAD.left - PAD.right
  const ih = height - PAD.top - PAD.bottom
  const x = (d: ISODate) => PAD.left + (dates.length === 1 ? iw / 2 : (daysBetween(first, d) / span) * iw)
  const y = (v: number) => PAD.top + ih - ((v - y0) / (y1 - y0 || 1)) * ih

  const onPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left + PAD.left
    let best = dates[0]
    for (const d of dates) if (Math.abs(x(d) - px) < Math.abs(x(best) - px)) best = d
    setHover(best)
  }

  return (
    <div ref={ref} className="relative">
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color, kind: s.kind }))} />}
      <div className="relative">
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(', ')}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" {...AXIS_TEXT} className="tabular-nums">
                {fmt(t)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={height - 4} {...AXIS_TEXT}>
            {shortDate(first)}
          </text>
          {last !== first && (
            <text x={width - PAD.right} y={height - 4} textAnchor="end" {...AXIS_TEXT}>
              {shortDate(last)}
            </text>
          )}
          {series.map((s) => {
            const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date))
            if (s.kind === 'line' && pts.length > 1) {
              return (
                <path
                  key={s.label}
                  d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join('')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )
            }
            const r = s.kind === 'dots' && pts.length > 40 ? 3 : 4
            return pts.map((p) => (
              <circle key={`${s.label}-${p.date}`} cx={x(p.date)} cy={y(p.value)} r={r} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
            ))
          })}
          {/* Marcador final de la última serie de línea */}
          {series
            .filter((s) => s.kind === 'line' && s.points.length > 1)
            .map((s) => {
              const p = [...s.points].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!
              return <circle key={`end-${s.label}`} cx={x(p.date)} cy={y(p.value)} r={4.5} fill={s.color} stroke="var(--color-surface)" strokeWidth={2} />
            })}
          {hover && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--color-muted)" strokeWidth={1} />
          )}
          <rect
            x={PAD.left}
            y={0}
            width={iw}
            height={height}
            fill="transparent"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointer}
            onPointerMove={onPointer}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hover && (
          <Tooltip x={x(hover)} width={width}>
            <p className="mb-0.5 text-muted">{shortDate(hover)}</p>
            {series.map((s) => {
              const p = s.points.find((q) => q.date === hover)
              return (
                p && (
                  <p key={s.label} className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                    <span className="font-semibold text-text tabular-nums">
                      {fmt(p.value)} {unit}
                    </span>
                    <span className="truncate text-muted">{s.label}</span>
                  </p>
                )
              )
            })}
          </Tooltip>
        )}
      </div>
    </div>
  )
}

/** Barras por día con línea de referencia (p. ej. la meta de kcal). */
export function DailyBarChart({
  data,
  color,
  unit,
  reference,
  height = 170,
}: {
  data: Point[]
  color: string
  unit: string
  reference?: { value: number; label: string }
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.value), reference?.value ?? 0)
  const ticks = niceTicks(0, max)
  const top = ticks[ticks.length - 1]
  const iw = width - PAD.left - PAD.right
  const ih = height - PAD.top - PAD.bottom
  const slot = iw / data.length
  const bw = Math.max(2, Math.min(24, slot - 2))
  const y = (v: number) => PAD.top + ih - (v / (top || 1)) * ih
  const base = PAD.top + ih

  const barPath = (cx: number, v: number) => {
    const h = base - y(v)
    if (h <= 0) return ''
    const r = Math.min(4, bw / 2, h)
    const l = cx - bw / 2
    return `M${l},${base}V${base - h + r}Q${l},${base - h} ${l + r},${base - h}H${l + bw - r}Q${l + bw},${base - h} ${l + bw},${base - h + r}V${base}Z`
  }

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={height} role="img" aria-label={`Barras por día (${unit})`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" {...AXIS_TEXT}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => (
          <path key={d.date} d={barPath(PAD.left + slot * (i + 0.5), d.value)} fill={color} opacity={hover == null || hover === i ? 1 : 0.55} />
        ))}
        {reference && reference.value > 0 && (
          <g>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--color-text)" strokeWidth={1} opacity={0.7} />
            {/* Fondo para que la etiqueta no se mezcle con las barras */}
            <rect x={width - PAD.right - reference.label.length * 6.2 - 8} y={y(reference.value) - 17} width={reference.label.length * 6.2 + 8} height={15} rx={4} fill="var(--color-surface)" opacity={0.9} />
            <text x={width - PAD.right - 4} y={y(reference.value) - 6} textAnchor="end" fontSize={11} fill="var(--color-text)">
              {reference.label}
            </text>
          </g>
        )}
        <text x={PAD.left} y={height - 4} {...AXIS_TEXT}>
          {shortDate(data[0].date)}
        </text>
        <text x={width - PAD.right} y={height - 4} textAnchor="end" {...AXIS_TEXT}>
          {shortDate(data[data.length - 1].date)}
        </text>
        <rect
          x={PAD.left}
          y={0}
          width={iw}
          height={height}
          fill="transparent"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => setHover(Math.min(data.length - 1, Math.max(0, Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / slot))))}
          onPointerMove={(e) => setHover(Math.min(data.length - 1, Math.max(0, Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / slot))))}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover != null && (
        <Tooltip x={PAD.left + slot * (hover + 0.5)} width={width}>
          <p className="text-muted">{shortDate(data[hover].date)}</p>
          <p className="font-semibold text-text tabular-nums">
            {fmt(data[hover].value)} {unit}
          </p>
        </Tooltip>
      )}
    </div>
  )
}

/** Barras horizontales con etiqueta y valor (p. ej. series por músculo). */
export function HBarChart({ rows, color, unit, band }: { rows: { label: string; value: number }[]; color: string; unit: string; band?: [number, number] }) {
  const max = Math.max(...rows.map((r) => r.value), band?.[1] ?? 0, 1)
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate text-text/90">{r.label}</span>
          <div className="relative h-3">
            {band && (
              <div
                className="absolute inset-y-0 rounded-sm bg-surface-2"
                style={{ left: `${(band[0] / max) * 100}%`, width: `${((band[1] - band[0]) / max) * 100}%` }}
              />
            )}
            <div className="absolute inset-y-0.5 left-0 rounded-r" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-8 text-right tabular-nums text-muted" aria-label={`${r.value} ${unit}`}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const HEAT = ['var(--color-surface-2)', 'var(--color-heat-1)', 'var(--color-heat-2)', 'var(--color-heat-3)', 'var(--color-heat-4)']

/** Calendario tipo GitHub: columnas = semanas, filas = lunes…domingo. */
export function CalendarHeatmap({
  grid,
  level,
  describe,
}: {
  grid: (ISODate | null)[][]
  level: (d: ISODate) => 0 | 1 | 2 | 3 | 4
  describe: (d: ISODate) => string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [sel, setSel] = useState<ISODate | null>(null)
  const labelW = 16
  const gap = 3
  const cell = Math.min(18, Math.floor((width - labelW - gap * grid.length) / grid.length))
  const days = ['L', '', 'X', '', 'V', '', 'D']

  return (
    <div ref={ref}>
      <svg width={width} height={7 * (cell + gap) + 16} role="img" aria-label="Calendario de actividad">
        {days.map((d, i) => (
          <text key={i} x={0} y={16 + i * (cell + gap) + cell * 0.75} {...AXIS_TEXT} fontSize={10}>
            {d}
          </text>
        ))}
        {grid.map((week, w) => {
          const firstOfMonth = week.find((d) => d && parseISO(d).getDate() <= 7 && parseISO(d).getDay() === 1)
          return (
            <g key={w}>
              {firstOfMonth && (
                <text x={labelW + w * (cell + gap)} y={10} {...AXIS_TEXT} fontSize={10}>
                  {parseISO(firstOfMonth).toLocaleDateString('es', { month: 'short' }).replace('.', '')}
                </text>
              )}
              {week.map(
                (d, i) =>
                  d && (
                    <rect
                      key={d}
                      x={labelW + w * (cell + gap)}
                      y={16 + i * (cell + gap)}
                      width={cell}
                      height={cell}
                      rx={3}
                      fill={HEAT[level(d)]}
                      stroke={sel === d ? 'var(--color-text)' : 'none'}
                      strokeWidth={1.5}
                      onPointerDown={() => setSel(d)}
                    />
                  ),
              )}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span className="min-h-4">{sel ? describe(sel) : 'Toca un día para ver el detalle'}</span>
        <span className="flex items-center gap-1">
          Menos
          {HEAT.map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          ))}
          Más
        </span>
      </div>
    </div>
  )
}

/** Vista de datos accesible (sin depender del tooltip). */
export function DataTable({ rows, unit }: { rows: Point[]; unit: string }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-muted">Ver datos</summary>
      <ul className="mt-2 max-h-48 overflow-y-auto">
        {[...rows].reverse().map((r) => (
          <li key={r.date} className="flex justify-between border-b border-line py-1 tabular-nums">
            <span className="text-muted">{shortDate(r.date)}</span>
            <span>
              {fmt(r.value)} {unit}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
