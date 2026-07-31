import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import User from '#models/user'
import { ListaZadanSchema } from '#database/schema'
import { SZKOPUL_URL } from '#services/szkopul'

export default class ListaZadan extends ListaZadanSchema {
  static table = 'lista_zadan'

  get urlWyslij(): string | null {
    if (this.szkopulContest && this.szkopulPiId) {
      return `${SZKOPUL_URL}/c/${this.szkopulContest}/submit/${this.szkopulPiId}/`
    }
    return this.linkWyslij
  }

  @column({
    prepare: (value: string[] | null) => JSON.stringify(value),
    consume: (value: any) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare tagi: string[] | null

  @belongsTo(() => PoziomTrudnosci, {
    foreignKey: 'idPoziomuTrudnosci',
    localKey: 'idPoziomuTrudnosci',
  })
  declare poziomuTrudnosci: BelongsTo<typeof PoziomTrudnosci>

  @belongsTo(() => User, {
    foreignKey: 'idAutora',
  })
  declare autor: BelongsTo<typeof User>
}
