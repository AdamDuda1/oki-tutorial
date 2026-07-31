import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { pobierzToken } from '#services/szkopul_polaczenie'
import { przygotujMapowanie, zapiszMapowanie } from '#services/szkopul_mapowanie'
import { SZKOPUL_TOKEN_URL } from '#services/szkopul'

export default class AdminSzkopulController {
  async index(ctx: HttpContext) {
    return this.pokaz(ctx)
  }

  async store(ctx: HttpContext) {
    const token = pobierzToken(ctx)
    if (!token) return this.pokaz(ctx)

    const raport = await przygotujMapowanie(token)
    const ile = await zapiszMapowanie(raport.doZapisu)

    if (ile > 0) {
      await AuditLog.record({
        user: ctx.auth.user!,
        akcja: 'zaktualizowano',
        typObiektu: 'zadanie',
        opis: `zmapowano ${ile} zadań na problemy Szkopuła`,
      })
    }

    ctx.session.flash(
      'success',
      ile > 0 ? `Zmapowano ${ile} zadań.` : 'Nie było nic do zmiany; mapowanie jest aktualne.'
    )
    return ctx.response.redirect().toRoute('admin.szkopul')
  }

  /** Wspólne renderowanie: bez tokenu prosimy o połączenie konta, z tokenem liczymy raport. */
  private async pokaz(ctx: HttpContext) {
    const token = pobierzToken(ctx)

    if (!token) {
      return ctx.view.render('pages/admin/szkopul', {
        raport: null,
        blad: 'Żeby zmapować zadania, połącz najpierw swoje konto Szkopuła na stronie „Konto”.',
        tokenUrl: SZKOPUL_TOKEN_URL,
      })
    }

    try {
      const raport = await przygotujMapowanie(token)
      return ctx.view.render('pages/admin/szkopul', { raport, blad: null, tokenUrl: null })
    } catch (error) {
      const powod = error instanceof Error ? error.message : String(error)
      return ctx.view.render('pages/admin/szkopul', {
        raport: null,
        blad: `Nie udało się pobrać danych ze Szkopuła: ${powod}`,
        tokenUrl: null,
      })
    }
  }
}
