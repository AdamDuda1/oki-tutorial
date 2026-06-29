import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'

export default class ListaZadanController {
  async index({ view, request }: HttpContext) {
    const qs = request.qs()
    const idPoziomuTrudnosci = qs.idPoziomuTrudnosci ? Number(qs.idPoziomuTrudnosci) : null
    const zrodlo = qs.zrodlo || null

    const query = ListaZadan.query().orderBy('id_zadania').preload('poziomuTrudnosci')
    if (idPoziomuTrudnosci) query.where('id_poziomu_trudnosci', idPoziomuTrudnosci)
    if (zrodlo) query.where('zrodlo', zrodlo)
    const zadania = await query

    const zrodlaRows = await ListaZadan.query().select('zrodlo').distinct('zrodlo').orderBy('zrodlo')
    const zrodla = zrodlaRows.map((r) => r.zrodlo)

    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')

    return view.render('pages/lista_zadan', {
      zadania,
      zrodla,
      poziomyTrudnosci,
      filters: { idPoziomuTrudnosci, zrodlo },
    })
  }
}
