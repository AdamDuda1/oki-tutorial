import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import Tag from '#models/tag'
import AuditLog from '#models/audit_log'
import type User from '#models/user'
import { taskValidator } from '#validators/task'
import { parseCsv, toCsv, detectDelimiter } from '#services/csv'

const CSV_COLUMNS = [
  { key: 'nazwa', label: 'Nazwa', required: true, kind: 'text' },
  { key: 'zrodlo', label: 'Źródło', required: true, kind: 'text' },
  { key: 'link_tresc', label: 'Link do treści', required: true, kind: 'url' },
  { key: 'link_wyslij', label: 'Link do wysłania', required: false, kind: 'url' },
  { key: 'link_zrodlo', label: 'Link do źródła', required: false, kind: 'url' },
  { key: 'link_omowienie_vid', label: 'Omówienie – wideo (URL)', required: false, kind: 'url' },
  { key: 'omowienie_text', label: 'Omówienie – tekst', required: false, kind: 'text' },
  { key: 'link_dodatkowe_materialy', label: 'Dodatkowe materiały (URL)', required: false, kind: 'url' },
  { key: 'trudnosc', label: 'Trudność (skrót lub nazwa)', required: false, kind: 'text' },
  { key: 'hint', label: 'Podpowiedź', required: false, kind: 'text' },
  { key: 'kod_cpp', label: 'Kod C++', required: false, kind: 'text' },
  { key: 'kod_python', label: 'Kod Python', required: false, kind: 'text' },
  { key: 'tagi', label: 'Tagi (oddzielone ;)', required: false, kind: 'text' },
] as const

const BOM = String.fromCharCode(0xfeff) // zeby z excelem dzialalo (i tak nie dziala :(()

function isUrl(value: string): boolean {
  try {
    void new URL(value)
    return true
  } catch {
    return false
  }
}

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

  async import_csv_form({ view }: HttpContext) {
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const trudnosci = poziomyTrudnosci.map((p) => p.skrot).filter(Boolean).join(', ')
    return view.render('pages/admin/import_tasks', { trudnosci, bledy: null })
  }

  async import_csv_template({ response }: HttpContext) {
    const header = CSV_COLUMNS.map((c) => c.key)
    const csv = BOM + toCsv([header])
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', 'attachment; filename="szablon_zadania.csv"')
    return response.send(csv)
  }

  async import_csv({ request, response, session, view, auth }: HttpContext) {
    const user = auth.user!
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')

    const trudnosci = poziomyTrudnosci.map((p) => p.skrot).filter(Boolean).join(', ')
    const rerenderZBledem = (bledy: string[]) =>
      view.render('pages/admin/import_tasks', { trudnosci, bledy })

    const file = request.file('csv', { extnames: ['csv', 'txt'], size: '10mb' })
    if (!file) return rerenderZBledem(['Nie wybrano pliku CSV.'])
    if (!file.isValid) return rerenderZBledem(file.errors.map((e) => e.message))

    const content = await readFile(file.tmpPath!, 'utf-8')
    const firstLine = (content.charCodeAt(0) === 0xfeff ? content.slice(1) : content).split(/\r?\n/, 1)[0] ?? ''
    const delimiter = detectDelimiter(firstLine)
    const rows = parseCsv(content, delimiter).filter((r) => r.some((c) => c.trim() !== ''))
    if (rows.length < 2) return rerenderZBledem(['Plik nie zawiera żadnych wierszy z danymi.'])

    const header = rows[0].map((h) => h.trim().toLowerCase())
    const brakujace = CSV_COLUMNS.filter((c) => c.required && !header.includes(c.key)).map((c) => c.key)
    if (brakujace.length) {
      const sep = delimiter === '\t' ? 'TAB' : delimiter
      return rerenderZBledem([
        `Brakuje wymaganych kolumn: ${brakujace.join(', ')}.`,
        `Wykryte nagłówki (separator „${sep}”): ${header.join(' | ')}.`,
        'Pobierz aktualny szablon i nie zmieniaj nazw nagłówków w pierwszym wierszu.',
      ])
    }

    /* difficulty lookup by skrót or rozwinięcie (case-insensitive) */
    const diffMap = new Map<string, number>()
    for (const p of poziomyTrudnosci) {
      if (p.skrot) diffMap.set(p.skrot.toLowerCase(), p.idPoziomuTrudnosci)
      if (p.rozwiniecie) diffMap.set(p.rozwiniecie.toLowerCase(), p.idPoziomuTrudnosci)
    }

    const get = (row: string[], key: string) => {
      const i = header.indexOf(key)
      return i === -1 ? '' : (row[i] ?? '').trim()
    }

    const bledy: string[] = []
    const przygotowane: Array<{ dane: Record<string, unknown>; tagi: string[] }> = []

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const nr = r + 1
      const rowErr: string[] = []

      for (const col of CSV_COLUMNS) {
        const v = get(row, col.key)
        if (col.required && !v) rowErr.push(`brak: ${col.label}`)
        else if (col.kind === 'url' && v && !isUrl(v)) rowErr.push(`niepoprawny URL: ${col.label}`)
      }

      const trudnosc = get(row, 'trudnosc')
      let idPoziomuTrudnosci: number | null = null
      if (trudnosc) {
        const id = diffMap.get(trudnosc.toLowerCase())
        if (id === undefined) rowErr.push(`nieznana trudność „${trudnosc}”`)
        else idPoziomuTrudnosci = id
      }

      if (rowErr.length) {
        bledy.push(`Wiersz ${nr}: ${rowErr.join(', ')}`)
        continue
      }

      przygotowane.push({
        dane: {
          nazwa: get(row, 'nazwa'),
          zrodlo: get(row, 'zrodlo'),
          linkTresc: get(row, 'link_tresc'),
          linkWyslij: get(row, 'link_wyslij') || null,
          linkZrodlo: get(row, 'link_zrodlo') || null,
          linkOmowienieVid: get(row, 'link_omowienie_vid') || null,
          omowienieText: get(row, 'omowienie_text') || null,
          linkDodatkoweMaterialy: get(row, 'link_dodatkowe_materialy') || null,
          idPoziomuTrudnosci,
          hint: get(row, 'hint') || null,
          kodCpp: get(row, 'kod_cpp') || null,
          kodPython: get(row, 'kod_python') || null,
        },
        tagi: get(row, 'tagi')
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter(Boolean),
      })
    }

    if (bledy.length) return rerenderZBledem(bledy)

    const opublikuj = user.canEditAllContent && request.input('published') === 'on'

    const daneDoZapisu = []
    for (const p of przygotowane) {
      const tagi = await normalizeTagi(p.tagi, user)
      daneDoZapisu.push({ ...p.dane, tagi, published: opublikuj, idAutora: user.id })
    }

    const utworzone = await ListaZadan.createMany(daneDoZapisu)
    await AuditLog.record({
      user,
      akcja: 'utworzono',
      typObiektu: 'zadanie',
      opis: `zaimportowano ${utworzone.length} zadań z CSV${opublikuj ? ' (opublikowane)' : ''}`,
    })

    session.flash('success', `Zaimportowano ${utworzone.length} zadań.`)
    return response.redirect().toRoute('admin.edit_task.index')
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
