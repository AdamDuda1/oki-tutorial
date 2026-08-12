import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ListaZadan from '#models/lista_zadan'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import Tag from '#models/tag'
import AuditLog from '#models/audit_log'
import { taskValidator } from '#validators/task'
import { parseCsv, toCsv, detectDelimiter } from '#services/csv'
import {
  mapowanieDlaZapisu,
  mapowanieDlaImportu,
  sprawdzZadanie,
} from '#services/szkopul_mapowanie'
import { pobierzToken } from '#services/szkopul_polaczenie'

const CSV_COLUMNS = [
  { key: 'nazwa', label: 'Nazwa', required: true, kind: 'text' },
  { key: 'zrodlo', label: 'Źródło', required: true, kind: 'text' },
  { key: 'link_tresc', label: 'Link do treści', required: true, kind: 'url' },
  { key: 'link_wyslij', label: 'Link do wysłania', required: false, kind: 'url' },
  { key: 'link_zrodlo', label: 'Link do źródła', required: false, kind: 'url' },
  { key: 'link_omowienie_vid', label: 'Omówienie - wideo (URL)', required: false, kind: 'url' },
  { key: 'omowienie_text', label: 'Omówienie - tekst', required: false, kind: 'text' },
  {
    key: 'link_dodatkowe_materialy',
    label: 'Dodatkowe materiały (URL)',
    required: false,
    kind: 'url',
  },
  { key: 'szkopul_contest', label: 'Szkopuł - konkurs', required: false, kind: 'text' },
  { key: 'szkopul_pi_id', label: 'Szkopuł - numer problemu', required: false, kind: 'number' },
  { key: 'szkopul_short_name', label: 'Szkopuł - skrót zadania', required: false, kind: 'text' },
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

async function pobierzZnaneNazwy(excludeId?: number): Promise<{ idZadania: number; nazwa: string }[]> {
  const query = ListaZadan.query().whereNull('deleted_at').select('id_zadania', 'nazwa')
  if (excludeId) query.whereNot('id_zadania', excludeId)
  const wiersze = await query
  return wiersze.map((z) => ({ idZadania: z.idZadania, nazwa: z.nazwa }))
}

async function normalizeTagi(tagi: string[] | undefined): Promise<string[] | null> {
  const names = [...new Set((tagi ?? []).map((t) => t.trim()).filter(Boolean))]
  if (names.length === 0) return null

  const wiersze = await Tag.query().whereIn('nazwa', names)
  const istniejace = new Set(wiersze.map((t) => t.nazwa))
  const znane = names.filter((n) => istniejace.has(n))
  return znane.length ? znane : null
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
    const znaneNazwy = await pobierzZnaneNazwy()
    return view.render('pages/admin/edit_task', {
      task: null,
      poziomyTrudnosci,
      tagi,
      sprawdzenie: null,
      znaneNazwy,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(taskValidator)
    const published = user.canEditAllContent && request.input('published') === 'on'
    const tagi = await normalizeTagi(payload.tagi)

    const mapowanie = await mapowanieDlaZapisu({
      link: payload.linkWyslij,
      podane: {
        szkopulContest: payload.szkopulContest ?? null,
        szkopulPiId: payload.szkopulPiId ?? null,
        szkopulShortName: payload.szkopulShortName ?? null,
      },
      token: pobierzToken(ctx),
    })

    const task = await ListaZadan.create({
      ...payload,
      ...mapowanie,
      published,
      tagi,
      idAutora: user.id,
    })
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

  async edit(ctx: HttpContext) {
    const { params, view, response, session, auth } = ctx
    const user = auth.user!
    const task = await ListaZadan.findOrFail(params.id)
    if (!user.canEditAllContent && task.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu.')
      return response.redirect().toRoute('admin.edit_task.index')
    }
    await task.load('autor')
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')
    const tagi = await Tag.query().orderBy('nazwa')
    const znaneNazwy = await pobierzZnaneNazwy(task.idZadania)

    const sprawdzenie = await sprawdzZadanie({
      konkurs: task.szkopulContest,
      pi: task.szkopulPiId,
      short: task.szkopulShortName,
      link: task.linkWyslij,
      token: pobierzToken(ctx),
    })

    return view.render('pages/admin/edit_task', {
      task,
      poziomyTrudnosci,
      tagi,
      sprawdzenie,
      znaneNazwy,
    })
  }

  async update(ctx: HttpContext) {
    const { params, request, response, session, auth } = ctx
    const user = auth.user!
    const task = await ListaZadan.findOrFail(params.id)
    if (!user.canEditAllContent && task.idAutora !== user.id) {
      session.flash('error', 'Brak dostępu!!1!')
      return response.redirect().toRoute('admin.edit_task.index')
    }
    const payload = await request.validateUsing(taskValidator)
    const published = user.canEditAllContent ? request.input('published') === 'on' : task.published
    const tagi = await normalizeTagi(payload.tagi)

    const mapowanie = await mapowanieDlaZapisu({
      link: payload.linkWyslij,
      podane: {
        szkopulContest: payload.szkopulContest ?? null,
        szkopulPiId: payload.szkopulPiId ?? null,
        szkopulShortName: payload.szkopulShortName ?? null,
      },
      poprzednie: {
        szkopulContest: task.szkopulContest,
        szkopulPiId: task.szkopulPiId,
        szkopulShortName: task.szkopulShortName,
      },
      token: pobierzToken(ctx),
    })

    task.merge({ ...payload, ...mapowanie, published, tagi })
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
    const trudnosci = poziomyTrudnosci
      .map((p) => p.skrot)
      .filter(Boolean)
      .join(', ')
    return view.render('pages/admin/import_tasks', { trudnosci, bledy: null })
  }

  async import_csv_template({ response }: HttpContext) {
    const header = CSV_COLUMNS.map((c) => c.key)
    const csv = BOM + toCsv([header])
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', 'attachment; filename="szablon_zadania.csv"')
    return response.send(csv)
  }

  async import_csv(ctx: HttpContext) {
    const { request, response, session, view, auth } = ctx
    const user = auth.user!
    const poziomyTrudnosci = await PoziomTrudnosci.query().orderBy('position')

    const trudnosci = poziomyTrudnosci
      .map((p) => p.skrot)
      .filter(Boolean)
      .join(', ')
    const rerenderZBledem = (bledy: string[]) =>
      view.render('pages/admin/import_tasks', { trudnosci, bledy })

    const file = request.file('csv', { extnames: ['csv', 'txt'], size: '10mb' })
    if (!file) return rerenderZBledem(['Nie wybrano pliku CSV.'])
    if (!file.isValid) return rerenderZBledem(file.errors.map((e) => e.message))

    const content = await readFile(file.tmpPath!, 'utf-8')
    const firstLine =
      (content.charCodeAt(0) === 0xfeff ? content.slice(1) : content).split(/\r?\n/, 1)[0] ?? ''
    const delimiter = detectDelimiter(firstLine)
    const rows = parseCsv(content, delimiter).filter((r) => r.some((c) => c.trim() !== ''))
    if (rows.length < 2) return rerenderZBledem(['Plik nie zawiera żadnych wierszy z danymi.'])

    const header = rows[0].map((h) => h.trim().toLowerCase())
    const brakujace = CSV_COLUMNS.filter((c) => c.required && !header.includes(c.key)).map(
      (c) => c.key
    )
    if (brakujace.length) {
      const sep = delimiter === '\t' ? 'TAB' : delimiter
      return rerenderZBledem([
        `Brakuje wymaganych kolumn: ${brakujace.join(', ')}.`,
        `Wykryte nagłówki (separator „${sep}”): ${header.join(' | ')}.`,
        'Pobierz aktualny szablon i nie zmieniaj nazw nagłówków w pierwszym wierszu.',
      ])
    }

    const diffMap = new Map<string, number>()
    for (const p of poziomyTrudnosci) {
      if (p.skrot) diffMap.set(p.skrot.toLowerCase(), p.idPoziomuTrudnosci)
      if (p.rozwiniecie) diffMap.set(p.rozwiniecie.toLowerCase(), p.idPoziomuTrudnosci)
    }

    const wszystkieTagi = await Tag.query()
    const znaneTagi = new Set(wszystkieTagi.map((t) => t.nazwa))

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
        else if (col.kind === 'number' && v && !/^\d+$/.test(v)) {
          rowErr.push(`oczekiwano liczby: ${col.label}`)
        }
      }

      const trudnosc = get(row, 'trudnosc')
      let idPoziomuTrudnosci: number | null = null
      if (trudnosc) {
        const id = diffMap.get(trudnosc.toLowerCase())
        if (id === undefined) rowErr.push(`nieznana trudność „${trudnosc}”`)
        else idPoziomuTrudnosci = id
      }

      const tagiWiersza = get(row, 'tagi')
        .split(/[;,]/)
        .map((t) => t.trim())
        .filter(Boolean)
      for (const t of tagiWiersza) {
        if (!znaneTagi.has(t)) rowErr.push(`nieznany tag „${t}”`)
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
          szkopulContest: get(row, 'szkopul_contest') || null,
          szkopulPiId: Number(get(row, 'szkopul_pi_id')) || null,
          szkopulShortName: get(row, 'szkopul_short_name') || null,
          idPoziomuTrudnosci,
          hint: get(row, 'hint') || null,
          kodCpp: get(row, 'kod_cpp') || null,
          kodPython: get(row, 'kod_python') || null,
        },
        tagi: tagiWiersza,
      })
    }

    if (bledy.length) return rerenderZBledem(bledy)

    const opublikuj = user.canEditAllContent && request.input('published') === 'on'

    const mapowania = await mapowanieDlaImportu(
      przygotowane.map((p) =>
        p.dane.szkopulContest ? null : (p.dane.linkWyslij as string | null)
      ),
      pobierzToken(ctx)
    )

    const daneDoZapisu = []
    for (const [i, p] of przygotowane.entries()) {
      const tagi = await normalizeTagi(p.tagi)
      const mapowanie = p.dane.szkopulContest ? {} : mapowania[i]
      daneDoZapisu.push({
        ...p.dane,
        ...mapowanie,
        tagi,
        published: opublikuj,
        idAutora: user.id,
      })
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

  async update_tag({ params, request, response, session, auth }: HttpContext) {
    const tag = await Tag.findOrFail(params.id)
    const nazwa = String(request.input('nazwa', '')).trim()
    const stara = tag.nazwa

    if (!nazwa) {
      session.flash('error', 'Nazwa tagu jest wymagana.')
      return response.redirect().back()
    }
    if (nazwa === stara) return response.redirect().back()

    const zajety = await Tag.query().where('nazwa', nazwa).whereNot('id_tagu', tag.idTagu).first()
    if (zajety) {
      session.flash('error', `Tag „${nazwa}” już istnieje.`)
      return response.redirect().back()
    }

    const zadania = await ListaZadan.query().whereNotNull('tagi')
    let zmienione = 0
    for (const z of zadania) {
      if (!(z.tagi ?? []).includes(stara)) continue
      z.tagi = (z.tagi ?? []).map((t) => (t === stara ? nazwa : t))
      await z.save()
      zmienione++
    }

    tag.nazwa = nazwa
    await tag.save()
    await AuditLog.record({
      user: auth.user!,
      akcja: 'zaktualizowano',
      typObiektu: 'tag',
      idObiektu: tag.idTagu,
      opis: `tag „${stara}” → „${nazwa}” (w ${zmienione} zadaniach)`,
    })
    session.flash('success', 'Nazwa tagu została zmieniona.')
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
