import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class CacheControlMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()
    if (!ctx.response.getHeader('cache-control')) {
      ctx.response.header('cache-control', 'no-cache')
    }
  }
}
