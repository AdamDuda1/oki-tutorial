import type { HttpContext } from '@adonisjs/core/http'
import Tematy from '#models/tematy'

export default class SciezkasController {
  async index({ params, view }: HttpContext) {
    const tematy = await Tematy.query()
      .where('published', true)
      .whereNull('deleted_at')
      .preload('poziom')
      .where('id_poziomu', params.id)
      .orderBy('position')
    return view.render('pages/sciezka', { tematy })
  }
}
