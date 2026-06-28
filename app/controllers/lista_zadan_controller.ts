import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'

export default class ListaZadanController {
  async index({ view, request }: HttpContext) {
    const qs = request.qs()
    const difficulty = qs.difficulty ? Number(qs.difficulty) : null
    const zrodlo = qs.zrodlo || null

    const query = ListaZadan.query().orderBy('id_zadania')
    if (difficulty) query.where('difficulty', difficulty)
    if (zrodlo) query.where('zrodlo', zrodlo)
    const zadania = await query

    const zrodlaRows = await ListaZadan.query()
      .select('zrodlo')
      .distinct('zrodlo')
      .orderBy('zrodlo')
    const zrodla = zrodlaRows.map((r) => r.zrodlo)

    return view.render('pages/lista_zadan', { zadania, zrodla, filters: { difficulty, zrodlo } })
  }
}
