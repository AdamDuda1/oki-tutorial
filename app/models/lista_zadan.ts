import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import { ListaZadanSchema } from '#database/schema'

export default class ListaZadan extends ListaZadanSchema {
  static table = 'lista_zadan'

  @belongsTo(() => PoziomTrudnosci, {
    foreignKey: 'idPoziomuTrudnosci',
    localKey: 'idPoziomuTrudnosci',
  })
  declare poziomuTrudnosci: BelongsTo<typeof PoziomTrudnosci>
}
