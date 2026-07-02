import { DateTime } from 'luxon'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import { TematySchema } from '#database/schema'
import * as relations from '@adonisjs/lucid/types/relations'
import Poziomy from '#models/poziomy'

export default class Tematy extends TematySchema {
  static table = 'tematy'

  @column({ isPrimary: true })
  declare idTematu: number

  @column()
  declare idPoziomu: number

  @column()
  declare position: number

  @column()
  declare nazwa: string

  @column()
  declare krotkiOpis: string | null

  @column()
  declare linkYt: string | null

  @column({
    prepare: (value: string[] | null) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zewnetrzneMaterialy: string[] | null

  @column({
    prepare: (value: string[] | null) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zewnetrzneMaterialyOpisy: string[] | null

  @column()
  declare customHtml: string | null

  @column({
    prepare: (value: number[] | null) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zadaniaCwiczeniowe: number[] | null

  @column({
    prepare: (value: number[] | null) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zadaniaNaPomysl: number[] | null

  @column({
    prepare: (value: number[] | null) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare zadaniaTreningowe: number[] | null

  @column()
  declare published: boolean

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Poziomy, {
    foreignKey: 'idPoziomu',
    localKey: 'idPoziomu',
  })
  declare poziom: relations.BelongsTo<typeof Poziomy>
}
