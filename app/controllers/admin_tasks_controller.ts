import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import Tag from '#models/tag'
import AuditLog from '#models/audit_log'
import type User from '#models/user'
import { taskValidator } from '#validators/task'

async function normalizeTagi(tagi: string[] | undefined, user: User): Promise<string[] | null> {
  const names = [...new Set((tagi ?? []).map((t) => t.trim()).filter(Boolean))]
  if (names.length === 0) return null

  await db.transaction(async (trx) => {
    const rows = await Tag.fetchOrCreateMany(
      'nazwa',
      names.map((nazwa) => ({ nazwa })),
      { client: trx }
    )
    for (const tag of rows.filter((t) => t.$isLocal)) {
      await AuditLog.record({
        user,
        akcja: 'utworzono',
        typObiektu: 'tag',
        idObiektu: tag.idTagu,
        opis: `tag „${tag.nazwa}” (przy edycji zadania)`,
        trx,
      })
    }
  })
  return names
}

export default class AdminTasksController {
  async index({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const zadania = await ListaZadan.query().whereNull('deleted_at').orderBy('id_zadania')
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
    await AuditLog.recordUpdate({
      user,
      typObiektu: 'zadanie',
      idObiektu: task.idZadania,
      opis: `zadanie „${task.nazwa}”`,
      model: task,
    })
    session.flash('success', 'Zadanie zostało zaktualizowane.')
    return response.redirect().back()
  }

  async toggle_published({ params, response, session, auth }: HttpContext) {
    const task = await ListaZadan.findOrFail(params.id)
    task.published = !task.published
    await AuditLog.recordUpdate({
      user: auth.user!,
      typObiektu: 'zadanie',
      idObiektu: task.idZadania,
      opis: `zadanie „${task.nazwa}”`,
      model: task,
    })
    session.flash(
      'success',
      task.published
        ? `Zadanie „${task.nazwa}” jest teraz widoczne.`
        : `Zadanie „${task.nazwa}” zostało ukryte.`
    )
    return response.redirect().back()
  }

  async destroy({ params, response, session, auth }: HttpContext) {
    const user = auth.user!
    const task = await ListaZadan.findOrFail(params.id)
    if (!user.canEditAllContent && task.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu.')
      return response.redirect().toRoute('admin.edit_task.index')
    }
    task.deletedAt = DateTime.now()
    await task.save()
    await AuditLog.record({
      user,
      akcja: 'usunięto',
      typObiektu: 'zadanie',
      idObiektu: task.idZadania,
      opis: `zadanie „${task.nazwa}”`,
    })
    session.flash('success', `Zadanie „${task.nazwa}” zostało usunięte.`)
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
      await db.transaction(async (trx) => {
        for (const data of levels) {
          const level = await PoziomTrudnosci.find(Number(data.id), { client: trx })
          if (!level) continue
          level.skrot = data.skrot?.trim() ?? level.skrot
          level.rozwiniecie = data.rozwiniecie?.trim() ?? level.rozwiniecie
          level.color = data.color || null
          const position = Number(data.position)
          if (Number.isInteger(position)) level.position = position
          await AuditLog.recordUpdate({
            user,
            typObiektu: 'poziom trudności',
            idObiektu: level.idPoziomuTrudnosci,
            opis: `poziom trudności „${level.skrot}”`,
            model: level,
            trx,
          })
        }
        const submittedIds = levels.map((d) => Number(d.id)).filter((n) => Number.isInteger(n))
        if (submittedIds.length === 0) return
        const doUsuniecia = await PoziomTrudnosci.query({ client: trx }).whereNotIn(
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
            trx,
          })
        }
      })
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
