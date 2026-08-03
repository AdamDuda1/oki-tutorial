import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import { SZKOPUL_WLACZONY } from '#services/szkopul'

const KLUCZ_TOKEN = 'szkopul_token'
const KLUCZ_LOGIN = 'szkopul_username'

export type Polaczenie = {
  username: string | null
  gosc: boolean
}

export function pobierzPolaczenie(ctx: HttpContext): Polaczenie | null {
  if (!SZKOPUL_WLACZONY) return null

  const user = ctx.auth.user
  if (user) {
    return user.szkopulPolaczony ? { username: user.szkopulUsername, gosc: false } : null
  }

  if (!ctx.session.get(KLUCZ_TOKEN)) return null
  return { username: ctx.session.get(KLUCZ_LOGIN) || null, gosc: true }
}

export function pobierzToken(ctx: HttpContext): string | null {
  if (!SZKOPUL_WLACZONY) return null

  const user = ctx.auth.user
  if (user) return user.szkopulTokenJawny

  const zaszyfrowany = ctx.session.get(KLUCZ_TOKEN)
  if (typeof zaszyfrowany !== 'string') return null

  try {
    return encryption.decrypt<string>(zaszyfrowany)
  } catch {
    return null
  }
}

export async function zapiszPolaczenie(ctx: HttpContext, token: string, username: string | null) {
  const user = ctx.auth.user
  if (user) {
    user.polaczSzkopul(token, username)
    await user.save()
    return
  }

  ctx.session.put(KLUCZ_TOKEN, encryption.encrypt(token))
  ctx.session.put(KLUCZ_LOGIN, username ?? '')
}

export async function usunPolaczenie(ctx: HttpContext) {
  const user = ctx.auth.user
  if (user) {
    user.rozlaczSzkopul()
    await user.save()
  }

  ctx.session.forget(KLUCZ_TOKEN)
  ctx.session.forget(KLUCZ_LOGIN)
}
