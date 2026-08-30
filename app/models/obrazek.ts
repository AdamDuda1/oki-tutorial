import { ObrazkiSchema } from '#database/schema'

/**
 * Wiersz jest niezmienny: `dane` nigdy nie są nadpisywane, a przy ponownym
 * wgraniu tego samego pliku zwracamy istniejący rekord (deduplikacja po `hash`).
 * Dzięki temu /obrazki/:id może iść z `Cache-Control: immutable`.
 */
export default class Obrazek extends ObrazkiSchema {
  static table = 'obrazki'

  static kolumnyBezDanych = ['id', 'nazwa', 'mime', 'hash', 'rozmiar', 'id_autora', 'created_at']

  get url(): string {
    return `/obrazki/${this.id}`
  }

  get rozmiarKb(): number {
    return Math.round(this.rozmiar / 1024)
  }
}
