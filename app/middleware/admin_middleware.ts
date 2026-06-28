import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.authenticateUsing(['web'], { loginRoute: '/login' })

    if (!ctx.auth.user?.isAdmin) {
      ctx.session.flash('error', 'Brak dostępu.')
      return ctx.response.redirect('/')
    }

    return next()
  }
}
