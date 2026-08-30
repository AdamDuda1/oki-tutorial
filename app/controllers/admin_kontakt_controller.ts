import type { HttpContext } from '@adonisjs/core/http'
import { pobierzZgloszenia, ulozKarte } from '#services/formularz_kontaktowy'

export default class AdminKontaktController {
  async index({ view, request, auth }: HttpContext) {
    const pomijCache = request.input('odswiez') !== undefined
    const wybranaKategoria = String(request.input('kategoria') ?? '')

    try {
      const zgloszenia = await pobierzZgloszenia({ pomijCache })
      /* Podpis w mailto bierzemy z konta, które właśnie ogląda panel. */
      const podpis = auth.user?.fullName?.trim() || auth.user?.email || ''
      const wszystkie = zgloszenia.map((z) => ulozKarte(z, podpis))

      /* Liczniki zawsze z pełnej listy, żeby filtr nie zjadał własnych etykiet. */
      const licznikRodzajow = new Map<string, number>()
      for (const karta of wszystkie) {
        const nazwa = karta.rodzaj || 'Bez kategorii'
        licznikRodzajow.set(nazwa, (licznikRodzajow.get(nazwa) ?? 0) + 1)
      }
      const rodzaje = [...licznikRodzajow]
        .map(([nazwa, ile]) => ({ nazwa, ile }))
        .sort((a, b) => b.ile - a.ile)

      const karty = wybranaKategoria
        ? wszystkie.filter((k) => (k.rodzaj || 'Bez kategorii') === wybranaKategoria)
        : wszystkie

      return view.render('pages/admin/kontakt', {
        karty,
        rodzaje,
        wybranaKategoria,
        lacznie: wszystkie.length,
        blad: null,
      })
    } catch (error) {
      const powod = error instanceof Error ? error.message : String(error)
      return view.render('pages/admin/kontakt', {
        karty: [],
        rodzaje: [],
        wybranaKategoria: '',
        lacznie: 0,
        blad: powod,
      })
    }
  }
}
