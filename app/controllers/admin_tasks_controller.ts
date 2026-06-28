import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import { taskValidator } from '#validators/task'

export default class AdminTasksController {
  async create({ view }: HttpContext) {
    return view.render('pages/admin/edit_task', { task: null })
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(taskValidator)
    const published = request.input('published') === 'on'

    await ListaZadan.create({ ...payload, published })
    session.flash('success', 'Zadanie zostało dodane.')
    return response.redirect().toRoute('lista_zadan')
  }

  async edit({ params, view }: HttpContext) {
    const task = await ListaZadan.findOrFail(params.id)
    return view.render('pages/admin/edit_task', { task })
  }

  async update({ params, request, response, session }: HttpContext) {
    const task = await ListaZadan.findOrFail(params.id)
    const payload = await request.validateUsing(taskValidator)
    const published = request.input('published') === 'on'

    task.merge({ ...payload, published })
    await task.save()
    session.flash('success', 'Zadanie zostało zaktualizowane.')
    return response.redirect().back()
  }
}
