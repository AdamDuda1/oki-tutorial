import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { SZKOPUL_WLACZONY } from '#services/szkopul'

export default class SzkopulMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!SZKOPUL_WLACZONY) return ctx.response.notFound()

    return next()
  }
}
