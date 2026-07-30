import { randomBytes } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User, { USER_ROLES } from '#models/user'
import AuditLog, { tozsameWartosci } from '#models/audit_log'
import Setting from '#models/setting'
import ListaZadan from '#models/lista_zadan'
import Tematy from '#models/tematy'
import Poziomy from '#models/poziomy'
import PoziomTrudnosci from '#models/poziom_trudnosci'
import type { LucidRow } from '@adonisjs/lucid/types/model'
import { policzRoznice, sformatujWartosc, type Roznica } from '#services/roznice'

async function countRows(query: { count: (c: string) => any }): Promise<number> {
  const row = await query.count('* as total').first()
  return Number(row?.$extras.total ?? 0)
}

const ODWRACALNE: Record<
  string,
  {
    znajdz: (id: number) => Promise<LucidRow | null>
    dostep: (model: any, user: User) => string | null
  }
> = {
  'zadanie': {
    znajdz: (id) => ListaZadan.find(id),
    dostep: (m, u) =>
      u.canEditAllContent || m.idAutora === u.id ? null : 'Brak dostępu do tego zadania.',
  },
  'temat': {
    znajdz: (id) => Tematy.find(id),
    dostep: (m, u) =>
      u.canEditAllContent || m.idAutora === u.id ? null : 'Brak dostępu do tego tematu.',
  },
  'poziom': {
    znajdz: (id) => Poziomy.find(id),
    dostep: (_, u) => (u.canEditAllContent ? null : 'Brak dostępu do poziomów.'),
  },
  'poziom trudności': {
    znajdz: (id) => PoziomTrudnosci.find(id),
    dostep: (_, u) => (u.canEditAllContent ? null : 'Brak dostępu do poziomów trudności.'),
  },
  'użytkownik': {
    znajdz: (id) => User.find(id),
    dostep: (m, u) =>
      !u.isAdmin
        ? 'Tylko admin może cofać zmiany na kontach.'
        : m.id === u.id
          ? 'Nie możesz cofnąć zmiany na własnym koncie.'
          : null,
  },
}

export default class AdminController {
  async index_users({ view }: HttpContext) {
    const users = await User.query() /*.whereNull('deleted_at')*/
    return view.render('pages/admin/users', { users, roles: USER_ROLES })
  }

  async update_role({ params, request, response, session, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const role = String(request.input('role', ''))

    if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      session.flash('error', 'Nieprawidłowa rola.')
      return response.redirect().back()
    }
    if (user.id === auth.user!.id) {
      session.flash('error', 'Nie możesz zmienić własnej roli.')
      return response.redirect().back()
    }

    user.role = role
    await AuditLog.recordUpdate({
      user: auth.user!,
      typObiektu: 'użytkownik',
      idObiektu: user.id,
      opis: `rola użytkownika ${user.email}`,
      model: user,
    })
    session.flash('success', `Użytkownik ${user.email} jest teraz ${role}.`)
    return response.redirect().back()
  }

  async reset_password({ params, response, session, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)
    if (user.id === auth.user!.id) {
      session.flash('error', 'Nie możesz zresetować własnego hasła.')
      return response.redirect().back()
    }
    const tempPassword = randomBytes(9).toString('base64url')
    user.password = tempPassword
    await user.save()
    await AuditLog.record({
      user: auth.user!,
      akcja: 'zaktualizowano',
      typObiektu: 'użytkownik',
      idObiektu: user.id,
      opis: `zresetowano hasło użytkownika ${user.email}`,
    })
    session.flash(
      'success',
      `Nowe hasło dla ${user.email}: ${tempPassword} - zapisz je teraz, nie zostanie pokazane ponownie.`
    )
    session.flash(
      'successNext',
      'Mam nadzieję że zapisałeś hasło. Jeśli nie, możesz wygenerować nowe ponownie.'
    )
    return response.redirect().back()
  }

  async destroy_user({ params, response, session, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)
    if (user.id === auth.user!.id) {
      session.flash('error', 'Nie możesz usunąć własnego konta.')
      return response.redirect().back()
    }
    await user.delete()
    await AuditLog.record({
      user: auth.user!,
      akcja: 'usunięto',
      typObiektu: 'użytkownik',
      idObiektu: user.id,
      opis: `użytkownik ${user.email} (rola: ${user.role})`,
    })
    session.flash('success', `Użytkownik ${user.email} został usunięty.`)
    return response.redirect().back()
  }

  async site_settings({ view }: HttpContext) {
    return view.render('pages/admin/site_settings', { ustawienia: await Setting.getAll() })
  }

  async update_site_settings({ request, response, session, auth }: HttpContext) {
    const nowe: Record<string, string> = {
      banner: String(request.input('banner') ?? '').trim(),
      maintenance: request.input('maintenance') ? '1' : '',
    }
    const stare = await Setting.getAll()
    for (const [key, val] of Object.entries(nowe)) {
      if ((stare[key] ?? '') === val) continue
      await Setting.set(key, val)
      await AuditLog.record({
        user: auth.user!,
        akcja: 'zaktualizowano',
        typObiektu: 'ustawienie',
        opis: `${key}: ${stare[key] || '-'} → ${val || '-'}`,
      })
    }
    session.flash('success', 'Zapisano ustawienia.')
    return response.redirect().back()
  }

  async stats_and_audit_log({ view, request }: HttpContext) {
    const qs = request.qs()
    const q = qs.q ? String(qs.q).trim() : ''
    const akcja = qs.akcja ? String(qs.akcja) : ''
    const typ = qs.typ ? String(qs.typ) : ''
    const od = qs.od ? String(qs.od) : ''
    const doDnia = qs.do ? String(qs.do) : ''
    const page = Math.max(1, Number(qs.page) || 1)

    const query = AuditLog.query().orderBy('id', 'desc')
    if (q) {
      query.where((grupa) => {
        grupa.where('opis', 'like', `%${q}%`).orWhere('uzytkownik', 'like', `%${q}%`)
        if (/^\d+$/.test(q)) grupa.orWhere('id_obiektu', Number(q))
      })
    }
    if (akcja) query.where('akcja', akcja)
    if (typ) query.where('typ_obiektu', typ)
    if (od) query.where('created_at', '>=', od)
    if (doDnia) {
      const nastepnyDzien = DateTime.fromISO(doDnia).plus({ days: 1 }).toFormat('yyyy-MM-dd')
      if (nastepnyDzien !== 'Invalid DateTime') query.where('created_at', '<', nastepnyDzien)
    }

    let paginator = await query.clone().paginate(page, 50)
    if (page > paginator.lastPage) {
      paginator = await query.clone().paginate(paginator.lastPage, 50)
    }
    paginator.baseUrl('/admin/stats_and_audit_log')

    const filtry = { q, akcja, typ, od, do: doDnia }
    paginator.queryString(Object.fromEntries(Object.entries(filtry).filter(([, v]) => v)))

    const kolumnaWartosci = async (kolumna: string) => {
      const wiersze = await db.from('audit_log').distinct(kolumna).orderBy(kolumna)
      return wiersze.map((r) => r[kolumna])
    }
    const opcje = {
      akcje: await kolumnaWartosci('akcja'),
      typy: await kolumnaWartosci('typ_obiektu'),
    }

    const roznice: Record<number, { pole: string; roznica: Roznica }[]> = {}
    for (const wpis of paginator.all()) {
      if (!wpis.zmiany) continue
      roznice[wpis.id] = Object.entries(wpis.zmiany).map(([pole, z]) => ({
        pole,
        roznica: policzRoznice(sformatujWartosc(z.przed), sformatujWartosc(z.po)),
      }))
    }

    const leaderboard = await db
      .from('audit_log')
      .join('users', 'users.id', 'audit_log.id_uzytkownika')
      .whereIn(
        'users.role',
        USER_ROLES.filter((r) => r !== 'user')
      )
      .select('users.email')
      .count('audit_log.id as zmiany')
      .groupBy('users.email')
      .orderBy('zmiany', 'desc')

    const stats = {
      zadania: await countRows(ListaZadan.query().whereNull('deleted_at')),
      zadaniaOpublikowane: await countRows(
        ListaZadan.query().whereNull('deleted_at').where('published', true)
      ),
      tematy: await countRows(Tematy.query().whereNull('deleted_at')),
      tematyOpublikowane: await countRows(
        Tematy.query().whereNull('deleted_at').where('published', true)
      ),
      uzytkownicy: await countRows(User.query()),
    }

    return view.render('pages/admin/stats_and_audit_log', {
      paginator,
      stats,
      leaderboard,
      filtry,
      opcje,
      roznice,
    })
  }

  async revert_audit_entry({ params, response, session, auth }: HttpContext) {
    const user = auth.user!
    const wpis = await AuditLog.findOrFail(params.id)

    if (!wpis.czyOdwracalny) {
      session.flash('error', 'Tego wpisu nie da się cofnąć.')
      return response.redirect().back()
    }

    const definicja = ODWRACALNE[wpis.typObiektu]
    const model = await definicja.znajdz(wpis.idObiektu!)
    if (!model) {
      session.flash('error', 'Obiekt z tego wpisu już nie istnieje.')
      return response.redirect().back()
    }

    const brakDostepu = definicja.dostep(model, user)
    if (brakDostepu) {
      session.flash('error', brakDostepu)
      return response.redirect().back()
    }

    const przestarzale: string[] = []
    const doCofniecia: [string, unknown][] = []
    for (const [pole, z] of wpis.polaDoCofniecia) {
      if (tozsameWartosci((model as any)[pole], z.po)) doCofniecia.push([pole, z.przed ?? null])
      else przestarzale.push(pole)
    }

    if (przestarzale.length > 0) {
      session.flash(
        'error',
        `Nie cofnięto — pola (${przestarzale.join(', ')}) zmieniły się już po tej edycji. Cofnij najpierw nowsze wpisy dla tego obiektu.`
      )
      return response.redirect().back()
    }

    for (const [pole, przed] of doCofniecia) (model as any)[pole] = przed

    await AuditLog.recordUpdate({
      user,
      typObiektu: wpis.typObiektu,
      idObiektu: wpis.idObiektu,
      opis: `cofnięcie zmiany #${wpis.id}: ${wpis.opis}`,
      model,
    })

    session.flash(
      'success',
      `Cofnięto zmianę #${wpis.id} (${doCofniecia.map(([pole]) => pole).join(', ')}).`
    )
    return response.redirect().back()
  }
}
