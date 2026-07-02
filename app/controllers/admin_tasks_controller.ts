import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import Tag from '#models/tag'
import { taskValidator } from '#validators/task'

async function normalizeTagi(tagi: string[] | undefined): Promise<string[] | null> {
  const names = [...new Set((tagi ?? []).map((t) => t.trim()).filter(Boolean))]
  if (names.length === 0) return null

  await Tag.fetchOrCreateMany(
    'nazwa',
    names.map((nazwa) => ({ nazwa }))
  )
  return names
}

export default class AdminTasksController {
  async index({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const zadania = await ListaZadan.query().orderBy('id_zadania')
    return view.render('pages/admin/choose_task_to_edit', { poziomyTrudnosci, zadania })
  }

  async create({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const tagi = await Tag.query().orderBy('nazwa')
    return view.render('pages/admin/edit_task', { task: null, poziomyTrudnosci, tagi })
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(taskValidator)
    const published = request.input('published') === 'on'
    const tagi = await normalizeTagi(payload.tagi)

    await ListaZadan.create({ ...payload, published, tagi })
    session.flash('success', 'Zadanie zostało dodane.')
    return response.redirect().toRoute('lista_zadan')
  }

  async edit({ params, view }: HttpContext) {
    const task = await ListaZadan.findOrFail(params.id)
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const tagi = await Tag.query().orderBy('nazwa')
    return view.render('pages/admin/edit_task', { task, poziomyTrudnosci, tagi })
  }

  async update({ params, request, response, session }: HttpContext) {
    const task = await ListaZadan.findOrFail(params.id)
    const payload = await request.validateUsing(taskValidator)
    const published = request.input('published') === 'on'
    const tagi = await normalizeTagi(payload.tagi)

    task.merge({ ...payload, published, tagi })
    await task.save()
    session.flash('success', 'Zadanie zostało zaktualizowane.')
    return response.redirect().back()
  }

  async create_tags({ view }: HttpContext) {
    const tagi = await Tag.query().orderBy('nazwa')
    const zadania = await ListaZadan.query().whereNotNull('tagi')

    const uzycia: Record<string, number> = {}
    for (const z of zadania) {
      for (const t of z.tagi ?? []) uzycia[t] = (uzycia[t] ?? 0) + 1
    }

    return view.render('pages/admin/edit_tags', { tagi, uzycia })
  }

  async store_tags({ request, response, session }: HttpContext) {
    const nazwa = String(request.input('nazwa', '')).trim()

    if (!nazwa) {
      session.flash('error', 'Nazwa tagu jest wymagana.')
      return response.redirect().back()
    }

    await Tag.firstOrCreate({ nazwa })
    session.flash('success', 'Tag został dodany.')
    return response.redirect().back()
  }

  async destroy_tag({ params, response, session }: HttpContext) {
    const tag = await Tag.findOrFail(params.id)

    const zadania = await ListaZadan.query().where('tagi', 'like', `%"${tag.nazwa}"%`)
    for (const z of zadania) {
      const tagi = (z.tagi ?? []).filter((t) => t !== tag.nazwa)
      z.tagi = tagi.length ? tagi : null
      await z.save()
    }

    await tag.delete()
    session.flash('success', 'Tag został usunięty.')
    return response.redirect().back()
  }

  async create_difficulty_levels({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    return view.render('pages/admin/edit_difficulty_levels', { poziomyTrudnosci })
  }

  async update_difficulty_levels({ request, response, session }: HttpContext) {
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
      const submittedIds = levels.map((d) => Number(d.id))
      await PoziomTrudnosci.query().whereNotIn('id_poziomu_trudnosci', submittedIds).delete()
    }

    session.flash('success', 'Poziomy trudności zostały zaktualizowane.')
    return response.redirect().back()
  }

  async store_difficulty_levels({ request, response, session }: HttpContext) {
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
