import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'

export default class ListaZadanController {
  async index({ view, request }: HttpContext) {
    const qs = request.qs()
    const idPoziomuTrudnosci = qs.idPoziomuTrudnosci ? Number(qs.idPoziomuTrudnosci) : null
    const zrodlo = qs.zrodlo || null
    const q = qs.q ? String(qs.q) : null
    const page = Math.max(1, Number(qs.page) || 1)
    const perPage = 20

    const query = ListaZadan.query().orderBy('id_zadania').preload('poziomuTrudnosci')
    if (idPoziomuTrudnosci) query.where('id_poziomu_trudnosci', idPoziomuTrudnosci)
    if (zrodlo) query.where('zrodlo', zrodlo)
    if (q) query.where('nazwa', 'like', `%${q}%`)

    const paginator = await query.paginate(page, perPage)
    const zadania = paginator.all()

    const makePageUrl = (p: number) => {
      const ps = new URLSearchParams()
      if (q) ps.set('q', q)
      if (idPoziomuTrudnosci) ps.set('idPoziomuTrudnosci', String(idPoziomuTrudnosci))
      if (zrodlo) ps.set('zrodlo', zrodlo)
      if (p > 1) ps.set('page', String(p))
      const s = ps.toString()
      return '/lista_zadan' + (s ? '?' + s : '')
    }

    const zrodlaRows = await ListaZadan.query()
      .select('zrodlo')
      .distinct('zrodlo')
      .orderBy('zrodlo')
    const zrodla = zrodlaRows.map((r) => r.zrodlo)

    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')

    const withAlpha: (hex: string, alpha: number) => string = (hex: string, alpha: number) => {
      const a = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')
      return hex + a
    }

    return view.render('pages/lista_zadan', {
      zadania,
      totalCount: paginator.total,
      currentPage: paginator.currentPage,
      totalPages: paginator.lastPage,
      prevUrl: paginator.currentPage > 1 ? makePageUrl(paginator.currentPage - 1) : null,
      nextUrl: paginator.currentPage < paginator.lastPage ? makePageUrl(paginator.currentPage + 1) : null,
      zrodla,
      poziomyTrudnosci,
      filters: { idPoziomuTrudnosci, zrodlo, q },
      withAlpha,
    })
  }
}
