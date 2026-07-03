import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { roles?: string[] } = {}) {
    await ctx.auth.authenticateUsing(['web'], { loginRoute: '/login' })

    const roles = options.roles ?? ['admin']
    if (!roles.includes(ctx.auth.user!.role)) {
      ctx.session.flash('error', 'Brak dostępu.')
      return ctx.response.redirect('/')
    }

    return next()
  }
}
