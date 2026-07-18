import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Setting from '#models/setting'

export default class MaintenanceMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if ((await Setting.getAll()).maintenance !== '1') return next()
    if (ctx.auth.user?.canAccessAdmin) return next()

    const url = ctx.request.url()
    if (url === '/login' || url === '/logout' || url.startsWith('/admin')) return next()

    return ctx.response.status(503).send(await ctx.view.render('pages/maintenance'))
  }
}
