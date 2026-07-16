import { randomBytes } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User, { USER_ROLES } from '#models/user'
import AuditLog from '#models/audit_log'
import ListaZadan from '#models/lista_zadan'
import Tematy from '#models/tematy'

async function countRows(query: { count: (c: string) => any }): Promise<number> {
  const row = await query.count('* as total').first()
  return Number(row?.$extras.total ?? 0)
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

  async stats_and_audit_log({ view, request }: HttpContext) {
    const page = Math.max(1, Number(request.qs().page) || 1)
    const paginator = await AuditLog.query().orderBy('id', 'desc').paginate(page, 50)
    paginator.baseUrl('/admin/stats_and_audit_log')

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

    return view.render('pages/admin/stats_and_audit_log', { paginator, stats, leaderboard })
  }
}
