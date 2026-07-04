import type { HttpContext } from '@adonisjs/core/http'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import Tag from '#models/tag'
import AuditLog from '#models/audit_log'
import type User from '#models/user'
import { taskValidator } from '#validators/task'

async function normalizeTagi(tagi: string[] | undefined, user: User): Promise<string[] | null> {
  const names = [...new Set((tagi ?? []).map((t) => t.trim()).filter(Boolean))]
  if (names.length === 0) return null

  const rows = await Tag.fetchOrCreateMany(
    'nazwa',
    names.map((nazwa) => ({ nazwa }))
  )
  for (const tag of rows.filter((t) => t.$isLocal)) {
    await AuditLog.record({
      user,
      akcja: 'utworzono',
      typObiektu: 'tag',
      idObiektu: tag.idTagu,
      opis: `tag „${tag.nazwa}” (przy edycji zadania)`,
    })
  }
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

  async store({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(taskValidator)
    const published = user.canEditAllContent && request.input('published') === 'on'
    const tagi = await normalizeTagi(payload.tagi, user)

    const task = await ListaZadan.create({ ...payload, published, tagi, idAutora: user.id })
    await AuditLog.record({
      user,
      akcja: 'utworzono',
      typObiektu: 'zadanie',
      idObiektu: task.idZadania,
      opis: `zadanie „${task.nazwa}”`,
    })
    session.flash('success', 'Zadanie zostało dodane.')
    return response.redirect().toRoute('lista_zadan')
  }

  async edit({ params, view, response, session, auth }: HttpContext) {
    const user = auth.user!
    const task = await ListaZadan.findOrFail(params.id)
    if (!user.canEditAllContent && task.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu.')
      return response.redirect().toRoute('admin.edit_task.index')
    }
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const tagi = await Tag.query().orderBy('nazwa')
    return view.render('pages/admin/edit_task', { task, poziomyTrudnosci, tagi })
  }

  async update({ params, request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const task = await ListaZadan.findOrFail(params.id)
    if (!user.canEditAllContent && task.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu!!1!')
      return response.redirect().toRoute('admin.edit_task.index')
    }
    const payload = await request.validateUsing(taskValidator)
    const published = user.canEditAllContent ? request.input('published') === 'on' : task.published
    const tagi = await normalizeTagi(payload.tagi, user)

    task.merge({ ...payload, published, tagi })
    const zmiany = AuditLog.diff(task)
    await task.save()
    if (zmiany) {
      await AuditLog.record({
        user,
        akcja: 'zaktualizowano',
        typObiektu: 'zadanie',
        idObiektu: task.idZadania,
        opis: `zadanie „${task.nazwa}”`,
        zmiany,
      })
    }
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

  async store_tags({ request, response, session, auth }: HttpContext) {
    const nazwa = String(request.input('nazwa', '')).trim()

    if (!nazwa) {
      session.flash('error', 'Nazwa tagu jest wymagana.')
      return response.redirect().back()
    }

    const tag = await Tag.firstOrCreate({ nazwa })
    if (tag.$isLocal) {
      await AuditLog.record({
        user: auth.user!,
        akcja: 'utworzono',
        typObiektu: 'tag',
        idObiektu: tag.idTagu,
        opis: `tag „${tag.nazwa}”`,
      })
    }
    session.flash('success', 'Tag został dodany.')
    return response.redirect().back()
  }

  async destroy_tag({ params, response, session, auth }: HttpContext) {
    const tag = await Tag.findOrFail(params.id)

    const zadania = await ListaZadan.query().where('tagi', 'like', `%"${tag.nazwa}"%`)
    for (const z of zadania) {
      const tagi = (z.tagi ?? []).filter((t) => t !== tag.nazwa)
      z.tagi = tagi.length ? tagi : null
      await z.save()
    }

    await tag.delete()
    await AuditLog.record({
      user: auth.user!,
      akcja: 'usunięto',
      typObiektu: 'tag',
      idObiektu: tag.idTagu,
      opis: `tag „${tag.nazwa}” (odpięty od ${zadania.length} zadań)`,
    })
    session.flash('success', 'Tag został usunięty.')
    return response.redirect().back()
  }

  async create_difficulty_levels({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    return view.render('pages/admin/edit_difficulty_levels', { poziomyTrudnosci })
  }

  async update_difficulty_levels({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
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
        const zmiany = AuditLog.diff(level)
        await level.save()
        if (zmiany) {
          await AuditLog.record({
            user,
            akcja: 'zaktualizowano',
            typObiektu: 'poziom trudności',
            idObiektu: level.idPoziomuTrudnosci,
            opis: `poziom trudności „${level.skrot}”`,
            zmiany,
          })
        }
      }
      const submittedIds = levels.map((d) => Number(d.id))
      const doUsuniecia = await PoziomTrudnosci.query().whereNotIn(
        'id_poziomu_trudnosci',
        submittedIds
      )
      for (const level of doUsuniecia) {
        await level.delete()
        await AuditLog.record({
          user,
          akcja: 'usunięto',
          typObiektu: 'poziom trudności',
          idObiektu: level.idPoziomuTrudnosci,
          opis: `poziom trudności „${level.skrot}”`,
        })
      }
    }

    session.flash('success', 'Poziomy trudności zostały zaktualizowane.')
    return response.redirect().back()
  }

  async store_difficulty_levels({ request, response, session, auth }: HttpContext) {
    const skrot = request.input('skrot', '').trim()
    const rozwiniecie = request.input('rozwiniecie', '').trim()
    const color = request.input('color') || null

    if (!skrot || !rozwiniecie) {
      session.flash('error', 'Skrót i rozwinięcie są wymagane.')
      return response.redirect().back()
    }

    const last = await PoziomTrudnosci.query().orderBy('position', 'desc').first()
    const position = (last?.position ?? 0) + 1

    const level = await PoziomTrudnosci.create({ skrot, rozwiniecie, color, position })
    await AuditLog.record({
      user: auth.user!,
      akcja: 'utworzono',
      typObiektu: 'poziom trudności',
      idObiektu: level.idPoziomuTrudnosci,
      opis: `poziom trudności „${level.skrot}”`,
    })
    session.flash('success', 'Poziom trudności został dodany.')
    return response.redirect().back()
  }
}
