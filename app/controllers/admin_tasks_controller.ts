import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import { taskValidator } from '#validators/task'

export default class AdminTasksController {
  async create({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    return view.render('pages/admin/edit_task', { task: null, poziomyTrudnosci })
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
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    return view.render('pages/admin/edit_task', { task, poziomyTrudnosci })
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

  async difficulty_levels_create({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    return view.render('pages/admin/edit_difficulty_levels', { poziomyTrudnosci })
  }

  async difficulty_levels_update({ request, response, session }: HttpContext) {
    const levels = request.input('levels') as Array<{
      id: string
      position: string
      skrot: string
      rozwiniecie: string
      color: string
    }>

    if (Array.isArray(levels)) {
      for (const data of levels) {
        const level = await PoziomTrudnosci.find(Number(data.id))
        if (!level) continue
        level.skrot = data.skrot?.trim() ?? level.skrot
        level.rozwiniecie = data.rozwiniecie?.trim() ?? level.rozwiniecie
        level.color = data.color || null
        level.position = Number(data.position)
        await level.save()
      }
      const submittedIds = levels.map(d => Number(d.id))
      await PoziomTrudnosci.query().whereNotIn('id_poziomu_trudnosci', submittedIds).delete()
    }

    session.flash('success', 'Poziomy trudności zostały zaktualizowane.')
    return response.redirect().back()
  }

  async difficulty_levels_store({ request, response, session }: HttpContext) {
    const skrot = request.input('skrot', '').trim()
    const rozwiniecie = request.input('rozwiniecie', '').trim()
    const color = request.input('color') || null

    if (!skrot || !rozwiniecie) {
      session.flash('error', 'Skrót i rozwinięcie są wymagane.')
      return response.redirect().back()
    }

    const last = await PoziomTrudnosci.query().orderBy('position', 'desc').first()
    const position = (last?.position ?? 0) + 1

    await PoziomTrudnosci.create({ skrot, rozwiniecie, color, position })
    session.flash('success', 'Poziom trudności został dodany.')
    return response.redirect().back()
  }
}
