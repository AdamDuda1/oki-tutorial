import type { HttpContext } from '@adonisjs/core/http'
import Tematy from '#models/tematy'
import Poziomy from '#models/poziomy'

export default class SciezkasController {
  async index({ params, view }: HttpContext) {
    const tematy = await Tematy.query()
      .where('published', true)
      .whereNull('deleted_at')
      .preload('poziom')
      .where('id_poziomu', params.id)
      .orderBy('position')

    for (const temat of tematy) {
      temat.$extras.materialy = (temat.zewnetrzneMaterialy || []).map((link, i) => ({
        link,
        opis: temat.zewnetrzneMaterialyOpisy?.[i] ?? '',
      }))
    }

    const poziomy = await Poziomy.query().whereNull('deleted_at')

    return view.render('pages/sciezka', { params, tematy, poziomy })
  }
}
