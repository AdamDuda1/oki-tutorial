import { column } from '@adonisjs/lucid/orm'
import { AuditLogSchema } from '#database/schema'
import type User from '#models/user'
import type { LucidRow } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type Zmiany = Record<string, { przed: unknown; po: unknown }>

const UKRYTE_POLA = new Set(['password'])  // TODO

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'tak' : 'nie'
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

export default class AuditLog extends AuditLogSchema {
  static table = 'audit_log'

  @column({
    prepare: (value: Zmiany | null) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zmiany: Zmiany | null

  get zmianyTeksty() {
    const wpisy = Object.entries(this.zmiany ?? {})
    const strona = (ktora: 'przed' | 'po') =>
      wpisy.map(([pole, z]) => `=== ${pole} ===\n${formatValue(z[ktora])}`).join('\n\n')
    return { przed: strona('przed'), po: strona('po') }
  }

  static async record(wpis: {
    user: User
    akcja: 'utworzono' | 'zaktualizowano' | 'usunięto'
    typObiektu: string
    idObiektu?: number | null
    opis: string
    zmiany?: Zmiany | null
    trx?: TransactionClientContract
  }) {
    await AuditLog.create(
      {
        idUzytkownika: wpis.user.id,
        uzytkownik: wpis.user.email,
        akcja: wpis.akcja,
        typObiektu: wpis.typObiektu,
        idObiektu: wpis.idObiektu ?? null,
        opis: wpis.opis,
        zmiany: wpis.zmiany ?? null,
      },
      { client: wpis.trx }
    )
  }

  static async recordUpdate(wpis: {
    user: User
    typObiektu: string
    idObiektu?: number | null
    opis: string
    model: LucidRow
    trx?: TransactionClientContract
  }) {
    const { model, ...dane } = wpis
    const zmiany = AuditLog.diff(model)
    if (wpis.trx) model.useTransaction(wpis.trx)
    await model.save()
    if (zmiany) {
      await AuditLog.record({ ...dane, akcja: 'zaktualizowano', zmiany })
    }
    return zmiany
  }

  static diff(model: { $dirty: Record<string, any>; $original: Record<string, any> }) {
    const zmiany: Zmiany = {}
    for (const [pole, poRaw] of Object.entries(model.$dirty)) {
      let przed = model.$original[pole] ?? null
      let po = poRaw ?? null
      if (typeof po === 'boolean' && typeof przed === 'number') przed = Boolean(przed)
      if (typeof przed === 'boolean' && typeof po === 'number') po = Boolean(po)
      if (JSON.stringify(przed) === JSON.stringify(po)) continue
      zmiany[pole] = UKRYTE_POLA.has(pole) ? { przed: '(ukryte)', po: '(ukryte)' } : { przed, po }
    }
    return Object.keys(zmiany).length > 0 ? zmiany : null
  }
}
