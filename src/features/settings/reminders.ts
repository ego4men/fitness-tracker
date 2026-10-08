// Recordatorios sin servidor: un archivo iCalendar (.ics) con eventos
// repetitivos y alarma, que iOS añade a la app Calendario. (Las PWA de iOS no
// pueden programar notificaciones locales; el push web exigiría un servidor.)

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 'MO', label: 'L' },
  { id: 'TU', label: 'M' },
  { id: 'WE', label: 'X' },
  { id: 'TH', label: 'J' },
  { id: 'FR', label: 'V' },
  { id: 'SA', label: 'S' },
  { id: 'SU', label: 'D' },
]

export interface Reminder {
  id: string
  title: string
  time: string // "HH:MM"
  days: Weekday[] // vacío = todos los días
  url?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Hora local "flotante" (sin zona): el evento suena a esa hora donde estés. */
function localStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

export function buildICS(reminders: Reminder[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fitness Tracker//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const r of reminders) {
    const [h, m] = r.time.split(':').map(Number)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
    const rule = r.days.length && r.days.length < 7 ? `FREQ=WEEKLY;BYDAY=${r.days.join(',')}` : 'FREQ=DAILY'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@fitness-tracker`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${localStamp(start)}`,
      'DURATION:PT10M',
      `RRULE:${rule}`,
      `SUMMARY:${escape(r.title)}`,
      ...(r.url ? [`URL:${r.url}`, `DESCRIPTION:${escape(`Abrir la app: ${r.url}`)}`] : []),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(r.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
