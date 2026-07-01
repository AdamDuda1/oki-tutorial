import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AdminController {
  async index_users({ view }: HttpContext) {
    const users = await User.query()/*.whereNull('deleted_at')*/
    return view.render('pages/admin/users', { users })
  }
}
