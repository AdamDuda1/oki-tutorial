import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { daneKontaValidator } from '#validators/user'
import { sprawdzToken, SZKOPUL_TOKEN_URL } from '#services/szkopul'
import { pobierzPolaczenie, usunPolaczenie, zapiszPolaczenie } from '#services/szkopul_polaczenie'

export default class KontoController {
  async index(ctx: HttpContext) {
    return ctx.view.render('pages/konto', {
      szkopulTokenUrl: SZKOPUL_TOKEN_URL,
      polaczenie: pobierzPolaczenie(ctx),
    })
  }

  async polaczSzkopul(ctx: HttpContext) {
    const { request, session, response } = ctx
    const token = String(request.input('token') ?? '').trim()

    if (!token) {
      session.flash('error', 'Wklej token ze Szkopuła.')
      return response.redirect().toRoute('konto')
    }

    const wynik = await sprawdzToken(token)
    if (!wynik.ok) {
      session.flash('error', wynik.powod)
      return response.redirect().toRoute('konto')
    }

    await zapiszPolaczenie(ctx, token, wynik.username)

    session.flash('success', `Połączono ze Szkopułem jako ${wynik.username}.`)
    if (!ctx.auth.user) {
      session.flash(
        'successNext',
        'Bez konta połączenie trzyma się tylko w tej przeglądarce i zniknie po wylogowaniu się z niej. Załóż konto, żeby zostało na stałe.'
      )
    }
    return response.redirect().toRoute('konto')
  }

  async rozlaczSzkopul(ctx: HttpContext) {
    await usunPolaczenie(ctx)

    ctx.session.flash('success', 'Odłączono konto Szkopuła.')
    ctx.session.flash(
      'successNext',
      'Jeśli chcesz mieć pewność, zregeneruj token na Szkopule. Stary przestanie wtedy działać wszędzie.'
    )
    return ctx.response.redirect().toRoute('konto')
  }

  async zapiszDane({ request, auth, session, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const dane = await request.validateUsing(daneKontaValidator)

    if (dane.email !== user.email) {
      const zajety = await User.query().where('email', dane.email).whereNot('id', user.id).first()
      if (zajety) {
        session.flash('error', 'Ten e-mail jest już zajęty przez inne konto.')
        return response.redirect().toRoute('konto')
      }
    }

    user.fullName = dane.fullName
    user.email = dane.email
    await user.save()

    session.flash('success', 'Zapisano dane konta.')
    return response.redirect().toRoute('konto')
  }
}
