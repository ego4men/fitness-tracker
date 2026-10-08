import { describe, expect, it } from 'vitest'
import { buildICS } from './reminders'

describe('recordatorios .ics', () => {
  it('genera eventos diarios y semanales con alarma', () => {
    const ics = buildICS(
      [
        { id: 'peso', title: 'Pésate, en ayunas', time: '07:30', days: [] },
        { id: 'entreno', title: 'Hoy toca entrenar', time: '18:00', days: ['MO', 'WE', 'FR'], url: 'https://x.test/' },
      ],
      new Date(2026, 9, 7, 12, 0),
    )
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261007T073000')
    expect(ics).toContain('RRULE:FREQ=DAILY')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(ics).toContain('SUMMARY:Pésate\\, en ayunas')
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })
})
