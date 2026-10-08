import { afterEach, describe, expect, it } from 'vitest'
import { FitnessDB } from '../../db/db'
import { createBackup, parseBackup, restoreBackup } from './backup'

let dbs: FitnessDB[] = []
function freshDb() {
  const db = new FitnessDB(`test-${crypto.randomUUID()}`)
  dbs.push(db)
  return db
}

afterEach(async () => {
  await Promise.all(dbs.map((d) => d.delete()))
  dbs = []
})

describe('backup', () => {
  it('exporta y restaura todos los datos en otra base', async () => {
    const src = freshDb()
    await src.water.add({ id: 'w1', date: '2026-10-07', ml: 250, createdAt: 1 })
    await src.body.add({ id: 'b1', date: '2026-10-07', weightKg: 82.5 })

    const json = JSON.stringify(await createBackup(src))

    const dst = freshDb()
    await dst.water.add({ id: 'old', date: '2020-01-01', ml: 999, createdAt: 0 })
    const restored = await restoreBackup(dst, parseBackup(json))

    expect(restored).toBe(2)
    expect(await dst.water.toArray()).toEqual([{ id: 'w1', date: '2026-10-07', ml: 250, createdAt: 1 }])
    expect((await dst.body.get('b1'))?.weightKg).toBe(82.5)
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(() => parseBackup('no es json')).toThrow(/JSON/)
    expect(() => parseBackup('{"foo":1}')).toThrow(/no es un respaldo/)
    expect(() => parseBackup('{"app":"fitness-tracker","formatVersion":99,"tables":{}}')).toThrow(/más nueva/)
  })
})
