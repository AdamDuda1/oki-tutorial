import type { HttpContext } from '@adonisjs/core/http'
import User, { USER_ROLES } from '#models/user'

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
    await user.save()
    session.flash('success', `Użytkownik ${user.email} jest teraz ${role}.`)
    return response.redirect().back()
  }
}
