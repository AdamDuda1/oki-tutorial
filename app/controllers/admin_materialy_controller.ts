import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Poziomy from '#models/poziomy'
import Tematy from '#models/tematy'
import ListaZadan from '#models/lista_zadan'
import AuditLog from '#models/audit_log'

/* zadania do wyszukiwarki + licznik użyć każdego zadania w innych tematach */
async function zadaniaPickerData(currentTematId: number | null) {
  const zadania = await ListaZadan.query()
    .whereNull('deleted_at')
    .preload('poziomuTrudnosci')
    .orderBy('id_zadania')
  const tematy = await Tematy.query().whereNull('deleted_at')
  const uzycia: Record<number, { ile: number; gdzie: { id: number; nazwa: string }[] }> = {}
  for (const t of tematy) {
    if (t.idTematu === currentTematId) continue
    const ids = new Set([
      ...(t.zadaniaCwiczeniowe ?? []),
      ...(t.zadaniaNaPomysl ?? []),
      ...(t.zadaniaTreningowe ?? []),
    ])
    for (const id of ids) {
      uzycia[id] ??= { ile: 0, gdzie: [] }
      uzycia[id].ile++
      uzycia[id].gdzie.push({ id: t.idTematu, nazwa: t.nazwa })
    }
  }
  return { zadania, uzycia }
}

export default class AdminMaterialyController {
  async index({ view }: HttpContext) {
    const poziomy = await Poziomy.query()
      .whereNull('deleted_at')
      .orderBy('position')
      .preload('tematy', (q) => q.whereNull('deleted_at').orderBy('position'))
    const allIds = poziomy.map((p) => p.idPoziomu)
    const wszystkie = await Tematy.query().whereNull('deleted_at').orderBy('position')
    const uncategorised = wszystkie.filter(
      (t) => t.idPoziomu === null || !allIds.includes(t.idPoziomu)
    )
    return view.render('pages/admin/materialy', { poziomy, uncategorised })
  }

  async update_positions({ request, response, session, auth }: HttpContext) {
    const pPos = (request.input('p') ?? {}) as Record<string, string>
    const tPos = (request.input('t') ?? {}) as Record<string, string>
    const tPoziom = (request.input('tp') ?? {}) as Record<string, string>

    const poziomy = await Poziomy.query().whereNull('deleted_at')
    const tematy = await Tematy.query().whereNull('deleted_at')
    const poziomyById = new Map(poziomy.map((p) => [p.idPoziomu, p]))
    const tematyById = new Map(tematy.map((t) => [t.idTematu, t]))

    /* keys are "i<id>" — see the hidden inputs in materialy.edge */
    let zmienione = 0
    await db.transaction(async (trx) => {
      for (const [key, pos] of Object.entries(pPos)) {
        const poziom = poziomyById.get(Number(key.slice(1)))
        const position = Number(pos)
        if (!poziom || !Number.isInteger(position)) continue
        poziom.position = position
        if (!poziom.$isDirty) continue
        poziom.useTransaction(trx)
        await poziom.save()
        zmienione++
      }
      for (const [key, pos] of Object.entries(tPos)) {
        const temat = tematyById.get(Number(key.slice(1)))
        const position = Number(pos)
        if (!temat || !Number.isInteger(position)) continue
        if (Number(tPoziom[key])) {
          const nowyPoziom = poziomyById.get(Number(tPoziom[key]))
          if (!nowyPoziom) continue
          temat.idPoziomu = nowyPoziom.idPoziomu
        }
        temat.position = position
        if (!temat.$isDirty) continue
        temat.useTransaction(trx)
        await temat.save()
        zmienione++
      }
      if (zmienione > 0) {
        await AuditLog.record({
          user: auth.user!,
          akcja: 'zaktualizowano',
          typObiektu: 'kolejność',
          opis: 'kolejność poziomów i tematów',
          trx,
        })
      }
    })
    session.flash('success', 'Kolejność została zaktualizowana.')
    return response.redirect().back()
  }

  async store_poziom({ request, response, session, auth }: HttpContext) {
    const nazwa = request.input('nazwa', '').trim()
    if (!nazwa) {
      session.flash('error', 'Nazwa jest wymagana.')
      return response.redirect().back()
    }
    const last = await Poziomy.query().whereNull('deleted_at').orderBy('position', 'desc').first()
    const poziom = await Poziomy.create({ nazwa, position: (last?.position ?? 0) + 1 })
    await AuditLog.record({
      user: auth.user!,
      akcja: 'utworzono',
      typObiektu: 'poziom',
      idObiektu: poziom.idPoziomu,
      opis: `poziom „${poziom.nazwa}”`,
    })
    session.flash('success', 'Poziom został dodany.')
    return response.redirect().back()
  }

  async edit_poziom({ params, view }: HttpContext) {
    const poziom = await Poziomy.findOrFail(params.id)
    return view.render('pages/admin/edit_poziom', { poziom })
  }

  async update_poziom({ params, request, response, session, auth }: HttpContext) {
    const poziom = await Poziomy.findOrFail(params.id)
    const nazwa = request.input('nazwa', '').trim()
    if (!nazwa) {
      session.flash('error', 'Nazwa jest wymagana.')
      return response.redirect().back()
    }
    poziom.nazwa = nazwa
    poziom.customHtml = String(request.input('customHtml') ?? '').trim() || null
    poziom.poboczny = request.input('poboczny') === 'on'
    await AuditLog.recordUpdate({
      user: auth.user!,
      typObiektu: 'poziom',
      idObiektu: poziom.idPoziomu,
      opis: `poziom „${poziom.nazwa}”`,
      model: poziom,
    })
    session.flash('success', 'Poziom został zaktualizowany.')
    return response.redirect().back()
  }

  async destroy_poziom({ params, response, session, auth }: HttpContext) {
    const poziom = await Poziomy.findOrFail(params.id)
    const tematy = await Tematy.query().where('id_poziomu', poziom.idPoziomu)
    await db.transaction(async (trx) => {
      for (const temat of tematy) {
        temat.idPoziomu = null
        temat.useTransaction(trx)
        await temat.save()
      }
      poziom.deletedAt = DateTime.now()
      poziom.useTransaction(trx)
      await poziom.save()
      await AuditLog.record({
        user: auth.user!,
        akcja: 'usunięto',
        typObiektu: 'poziom',
        idObiektu: poziom.idPoziomu,
        opis: `poziom „${poziom.nazwa}” (odpięto ${tematy.length} tematów)`,
        trx,
      })
    })
    session.flash('success', 'Poziom usunięty.')
    return response.redirect().toRoute('admin.materialy')
  }

  async create_temat({ request, view }: HttpContext) {
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')
    const selectedPoziomu = request.input('poziom') ? Number(request.input('poziom')) : null
    const { zadania, uzycia } = await zadaniaPickerData(null)
    return view.render('pages/admin/edit_temat', {
      temat: null,
      poziomy,
      selectedPoziomu,
      zadania,
      uzycia,
    })
  }

  async store_temat({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const nazwa = request.input('nazwa', '').trim()
    const idPoziomu = Number(request.input('idPoziomu'))
    if (!nazwa || !idPoziomu) {
      session.flash('error', 'Nazwa i poziom są wymagane.')
      return response.redirect().back()
    }
    const last = await Tematy.query()
      .where('id_poziomu', idPoziomu)
      .whereNull('deleted_at')
      .orderBy('position', 'desc')
      .first()
    const matUrls = (request.input('mat_url') ?? []) as string[]
    const matOpisy = (request.input('mat_opis') ?? []) as string[]
    const customHtml = String(request.input('customHtml') ?? '').trim()
    const zadaniaCwiczenioweRaw = String(request.input('zadaniaCwiczeniowe') ?? '').trim()
    const zadaniaCwiczeniowe = zadaniaCwiczenioweRaw
      ? zadaniaCwiczenioweRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0)
      : null
    const zadaniaNaPomyslRaw = String(request.input('zadaniaNaPomysl')).trim()
    const zadaniaNaPomysl = zadaniaNaPomyslRaw
      ? zadaniaNaPomyslRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0)
      : null
    const zadaniaTreningoweRaw = String(request.input('zadaniaTreningowe')).trim()
    const zadaniaTreningowe = zadaniaTreningoweRaw
      ? zadaniaTreningoweRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0)
      : null
    const temat = await Tematy.create({
      nazwa,
      idPoziomu,
      position: (last?.position ?? 0) + 1,
      krotkiOpis: request.input('krotkiOpis') || null,
      linkYt: request.input('linkYt') || null,
      published: user.canEditAllContent && request.input('published') === 'on',
      zewnetrzneMaterialy: matUrls.filter(Boolean),
      zewnetrzneMaterialyOpisy: matOpisy.filter(Boolean),
      customHtml: user.canEditAllContent ? customHtml : null,
      idAutora: user.id,
      zadaniaCwiczeniowe,
      zadaniaNaPomysl,
      zadaniaTreningowe,
    })
    await AuditLog.record({
      user,
      akcja: 'utworzono',
      typObiektu: 'temat',
      idObiektu: temat.idTematu,
      opis: `temat „${temat.nazwa}”`,
    })
    session.flash('success', 'Temat został dodany.')
    return response.redirect().toRoute('admin.materialy')
  }

  async edit_temat({ params, view, response, session, auth }: HttpContext) {
    const user = auth.user!
    const temat = await Tematy.findOrFail(params.id)
    if (!user.canEditAllContent && temat.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu.')
      return response.redirect().toRoute('admin.materialy')
    }
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')
    const { zadania, uzycia } = await zadaniaPickerData(temat.idTematu)
    return view.render('pages/admin/edit_temat', {
      temat,
      poziomy,
      selectedPoziomu: null,
      zadania,
      uzycia,
    })
  }

  async update_temat({ params, request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const temat = await Tematy.findOrFail(params.id)
    if (!user.canEditAllContent && temat.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu.')
      return response.redirect().toRoute('admin.materialy')
    }
    const matUrls = (request.input('mat_url') ?? []) as string[]
    const matOpisy = (request.input('mat_opis') ?? []) as string[]
    const customHtml = String(request.input('customHtml') ?? '').trim()
    const zadaniaCwiczenioweRaw = String(request.input('zadaniaCwiczeniowe')).trim()
    const zadaniaCwiczeniowe = zadaniaCwiczenioweRaw
      ? zadaniaCwiczenioweRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0)
      : null
    const zadaniaNaPomyslRaw = String(request.input('zadaniaNaPomysl')).trim()
    const zadaniaNaPomysl = zadaniaNaPomyslRaw
      ? zadaniaNaPomyslRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0)
      : null
    const zadaniaTreningoweRaw = String(request.input('zadaniaTreningowe')).trim()
    const zadaniaTreningowe = zadaniaTreningoweRaw
      ? zadaniaTreningoweRaw
          .split('\n')
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0)
      : null
    temat.nazwa = request.input('nazwa', temat.nazwa).trim()
    temat.idPoziomu = Number(request.input('idPoziomu', temat.idPoziomu)) || temat.idPoziomu
    temat.krotkiOpis = request.input('krotkiOpis') || null
    temat.linkYt = request.input('linkYt') || null
    temat.zewnetrzneMaterialy = matUrls.filter(Boolean)
    temat.zewnetrzneMaterialyOpisy = matOpisy.filter(Boolean)
    temat.zadaniaCwiczeniowe = zadaniaCwiczeniowe
    temat.zadaniaNaPomysl = zadaniaNaPomysl
    temat.zadaniaTreningowe = zadaniaTreningowe
    if (user.canEditAllContent) {
      temat.published = request.input('published') === 'on'
      temat.customHtml = customHtml
    }
    await AuditLog.recordUpdate({
      user,
      typObiektu: 'temat',
      idObiektu: temat.idTematu,
      opis: `temat „${temat.nazwa}”`,
      model: temat,
    })
    session.flash('success', 'Temat został zaktualizowany.')
    return response.redirect().back()
  }
}
