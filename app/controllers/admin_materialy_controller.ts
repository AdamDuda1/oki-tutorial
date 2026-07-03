import type { HttpContext } from '@adonisjs/core/http'
import Poziomy from '#models/poziomy'
import Tematy from '#models/tematy'

export default class AdminMaterialyController {
  async index({ view }: HttpContext) {
    const poziomy = await Poziomy.query()
      .whereNull('deleted_at')
      .orderBy('position')
      .preload('tematy', q => q.whereNull('deleted_at').orderBy('position'))
    const allIds = poziomy.map(p => p.idPoziomu)
    const wszystkie = await Tematy.query().whereNull('deleted_at').orderBy('position')
    const uncategorised = wszystkie.filter(
      (t) => t.idPoziomu === null || !allIds.includes(t.idPoziomu)
    )
    return view.render('pages/admin/materialy', { poziomy, uncategorised })
  }

  async update_positions({ request, response, session }: HttpContext) {
    const pPos = (request.input('p') ?? {}) as Record<string, string>
    const tPos = (request.input('t') ?? {}) as Record<string, string>
    for (const [id, pos] of Object.entries(pPos)) {
      await Poziomy.query().where('id_poziomu', Number(id)).update({ position: Number(pos) })
    }
    for (const [id, pos] of Object.entries(tPos)) {
      await Tematy.query().where('id_tematu', Number(id)).update({ position: Number(pos) })
    }
    session.flash('success', 'Kolejność została zaktualizowana.')
    return response.redirect().back()
  }

  async store_poziom({ request, response, session }: HttpContext) {
    const nazwa = request.input('nazwa', '').trim()
    if (!nazwa) {
      session.flash('error', 'Nazwa jest wymagana.')
      return response.redirect().back()
    }
    const last = await Poziomy.query().whereNull('deleted_at').orderBy('position', 'desc').first()
    await Poziomy.create({ nazwa, position: (last?.position ?? 0) + 1 })
    session.flash('success', 'Poziom został dodany.')
    return response.redirect().back()
  }

  async create_temat({ request, view }: HttpContext) {
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')
    const selectedPoziomu = request.input('poziom') ? Number(request.input('poziom')) : null
    return view.render('pages/admin/edit_temat', { temat: null, poziomy, selectedPoziomu })
  }

  async store_temat({ request, response, session }: HttpContext) {
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
    await Tematy.create({
      nazwa,
      idPoziomu,
      position: (last?.position ?? 0) + 1,
      krotkiOpis: request.input('krotkiOpis') || null,
      linkYt: request.input('linkYt') || null,
      published: request.input('published') === 'on',
      zewnetrzneMaterialy: matUrls.filter(Boolean),
      zewnetrzneMaterialyOpisy: matOpisy.filter(Boolean),
      customHtml,
      zadaniaCwiczeniowe,
      zadaniaNaPomysl,
      zadaniaTreningowe,
    })
    session.flash('success', 'Temat został dodany.')
    return response.redirect().toRoute('admin.materialy')
  }

  async edit_temat({ params, view }: HttpContext) {
    const temat = await Tematy.findOrFail(params.id)
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')
    return view.render('pages/admin/edit_temat', { temat, poziomy, selectedPoziomu: null })
  }

  async update_temat({ params, request, response, session }: HttpContext) {
    const temat = await Tematy.findOrFail(params.id)
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
      ? zadaniaNaPomyslRaw.split('\n').map(s => Number(s.trim())).filter(n => n > 0)
      : null
    const zadaniaTreningoweRaw = String(request.input('zadaniaTreningowe')).trim()
    const zadaniaTreningowe = zadaniaTreningoweRaw
      ? zadaniaTreningoweRaw.split('\n').map(s => Number(s.trim())).filter(n => n > 0)
      : null
    temat.nazwa = request.input('nazwa', temat.nazwa).trim()
    temat.idPoziomu = Number(request.input('idPoziomu', temat.idPoziomu)) || temat.idPoziomu
    temat.krotkiOpis = request.input('krotkiOpis') || null
    temat.linkYt = request.input('linkYt') || null
    temat.published = request.input('published') === 'on'
    temat.zewnetrzneMaterialy = matUrls.filter(Boolean)
    temat.zewnetrzneMaterialyOpisy = matOpisy.filter(Boolean)
    temat.zadaniaCwiczeniowe = zadaniaCwiczeniowe
    temat.zadaniaNaPomysl = zadaniaNaPomysl
    temat.zadaniaTreningowe = zadaniaTreningowe
    temat.customHtml = customHtml
    await temat.save()
    session.flash('success', 'Temat został zaktualizowany.')
    return response.redirect().back()
  }
}
