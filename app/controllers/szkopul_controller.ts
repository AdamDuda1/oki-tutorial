import type { HttpContext } from '@adonisjs/core/http'
import { pobierzToken } from '#services/szkopul_polaczenie'
import { pobierzWyniki } from '#services/szkopul_wyniki'

export default class SzkopulController {
  async odswiez(ctx: HttpContext) {
    const { response, session } = ctx

    if (!pobierzToken(ctx)) {
      session.flash('error', 'Najpierw połącz konto Szkopuła.')
      return response.redirect().back()
    }

    try {
      const wyniki = await pobierzWyniki(ctx, { wymus: true })
      session.flash(
        'success',
        wyniki.size > 0
          ? 'Wyniki odświeżone.'
          : 'Odświeżono, ale Szkopuł nie zwrócił jeszcze żadnych wyników.'
      )
    } catch {
      session.flash('error', 'Nie udało się pobrać wyników ze Szkopuła. Spróbuj za chwilę.')
    }

    return response.redirect().back()
  }
}
