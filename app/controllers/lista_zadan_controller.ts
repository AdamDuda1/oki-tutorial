import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import Tag from '#models/tag'

export default class ListaZadanController {
  async index({ view, request }: HttpContext) {
    const qs = request.qs()
    const idPoziomuTrudnosci = qs.idPoziomuTrudnosci ? Number(qs.idPoziomuTrudnosci) : null
    const zrodloFilter = [qs.zrodlo].flat().filter(Boolean).map(String)
    const tagiFilter = [qs.tagi].flat().filter(Boolean).map(String)
    const q = qs.q ? String(qs.q) : null
    const page = Math.max(1, Number(qs.page) || 1)

    const wszystkieTagi = await Tag.query().orderBy('nazwa')
    const znaneTagi = wszystkieTagi.map((t) => t.nazwa)
    const wybraneTagi = tagiFilter.filter((t) => znaneTagi.includes(t))

    const query = ListaZadan.query().orderBy('id_zadania').preload('poziomuTrudnosci')
    if (idPoziomuTrudnosci) query.where('id_poziomu_trudnosci', idPoziomuTrudnosci)
    if (zrodloFilter.length) query.whereIn('zrodlo', zrodloFilter)
    for (const tag of wybraneTagi) {
      query.where('tagi', 'like', `%"${tag}"%`)
    }
    if (q) query.where('nazwa', 'like', `%${q}%`)

    const paginator = await query.paginate(page, 20)
    paginator.baseUrl('/lista_zadan')

    const activeFilters: Record<string, any> = {}
    if (q) activeFilters.q = q
    if (idPoziomuTrudnosci) activeFilters.idPoziomuTrudnosci = idPoziomuTrudnosci
    if (zrodloFilter.length) activeFilters.zrodlo = zrodloFilter
    if (wybraneTagi.length) activeFilters.tagi = wybraneTagi
    paginator.queryString(activeFilters)

    const filters = { idPoziomuTrudnosci, zrodlo: zrodloFilter, tagi: wybraneTagi, q }

    const withAlpha: (hex: string, alpha: number) => string = (hex: string, alpha: number) => {
      const a = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')
      return hex + a
    }

    const zrodlaRows = await ListaZadan.query().distinct('zrodlo').orderBy('zrodlo')
    const zrodla = zrodlaRows.map((r) => r.zrodlo)
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')

    if (request.header('x-requested-with') === 'fetch') {
      return view.render('pages/partials/zadania_table', {
        paginator,
        zrodla,
        poziomyTrudnosci,
        filters,
        withAlpha,
      })
    }
    return view.render('pages/lista_zadan', {
      paginator,
      zrodla,
      wszystkieTagi,
      poziomyTrudnosci,
      filters,
      withAlpha,
    })
  }
}
