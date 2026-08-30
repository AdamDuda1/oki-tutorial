import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import User from '#models/user'
import { ListaZadanSchema } from '#database/schema'
import { SZKOPUL_URL } from '#services/szkopul'
import { escapujHtml, oczyscBlok } from '#services/bezpieczna_tresc'

const URL_RE = /https?:\/\/[^\s<]+/g

function tekstNaHtml(tekst: string): string {
  return escapujHtml(tekst)
    .replace(URL_RE, (dopasowanie) => {
      const ogon = dopasowanie.match(/[.,;:!?)\]}'"]+$/)?.[0] ?? ''
      const url = ogon ? dopasowanie.slice(0, -ogon.length) : dopasowanie
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${ogon}`
    })
    .replace(/\n/g, '<br />')
}

export default class ListaZadan extends ListaZadanSchema {
  static table = 'lista_zadan'

  get urlWyslij(): string | null {
    if (this.szkopulContest && this.szkopulPiId) {
      return `${SZKOPUL_URL}/c/${this.szkopulContest}/submit/${this.szkopulPiId}/`
    }
    return this.linkWyslij
  }

  get omowienieHtml(): string | null {
    const src = this.omowienieText
    if (!src) return null
    const zawieraZnaczniki = /<[a-z][^>]*>/i.test(src)
    return oczyscBlok(zawieraZnaczniki ? src : tekstNaHtml(src))
  }

  get urlPytanie(): string | null {
    if (this.szkopulContest && this.szkopulPiId) {
      return `${SZKOPUL_URL}/c/${this.szkopulContest}/questions/add/?category=p_${this.szkopulPiId}`
    }
    return null
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
