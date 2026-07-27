import { updateProfileValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async edit({ view }: HttpContext) {
    return view.render('pages/ustawienia')
  }

  async update({ request, response, auth, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateProfileValidator, {
      meta: { userId: user.id },
    })

    user.merge(payload)
    await user.save()

    session.flash('success', 'Zapisano zmiany.')
    return response.redirect().toRoute('settings')
  }
}
