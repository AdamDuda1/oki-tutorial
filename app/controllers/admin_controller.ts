import type { HttpContext } from '@adonisjs/core/http'
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

  async stats_and_audit_log({ view, request }: HttpContext) {
    const page = Math.max(1, Number(request.qs().page) || 1)
    const paginator = await AuditLog.query().orderBy('id', 'desc').paginate(page, 50)
    paginator.baseUrl('/admin/stats_and_audit_log')

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

    return view.render('pages/admin/stats_and_audit_log', { paginator, stats })
  }
}
