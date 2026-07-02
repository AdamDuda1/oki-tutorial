import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class LogLoadTimesMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const start = process.hrtime.bigint()
    await next()
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    // ctx.logger.info({
    //   method: ctx.request.method(),
    //   url: ctx.request.url(true),
    //   status: ctx.response.getStatus(),
    //   durationMs: +ms.toFixed(1),
    //   ip: ctx.request.ip(),
    //   userId: ctx.auth?.user?.id ?? null,
    // })
    ctx.logger.info(`---------------------
REQUEST
-------
Method:      ${ctx.request.method()}
URL:         ${ctx.request.url(true)}
IP:          ${ctx.request.ip()}

RESPONSE
--------
Status:      ${ctx.response.getStatus()}
Duration:    ${ms.toFixed(1)} ms

AUTH
----
User ID:     ${ctx.auth?.user?.id ?? 'Anonymous'}
`)
  }
}
