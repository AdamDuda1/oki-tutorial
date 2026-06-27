import { DateTime } from 'luxon'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Temat from '#models/tematy'
import { PoziomySchema } from '#database/schema'

export default class Poziomy extends PoziomySchema {
  static table = 'poziomy'

  @column({ isPrimary: true })
  declare idPoziomu: number

  @column()
  declare position: number

  @column()
  declare nazwa: string

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Temat, {
    foreignKey: 'idPoziomu',
    localKey: 'idPoziomu',
  })
  declare tematy: HasMany<typeof Temat>
}
