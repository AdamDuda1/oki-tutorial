// oi oi oi
import env from '#start/env'

export const SZKOPUL_URL = 'https://szkopul.edu.pl'
export const SZKOPUL_TOKEN_URL = `${SZKOPUL_URL}/api/token`

export const SZKOPUL_WLACZONY = env.get('SZKOPUL_ENABLED') ?? true

const TIMEOUT_MS = 10_000

export type WynikSprawdzenia =
  | { ok: true; username: string }
  | { ok: false; powod: string; rozlaczyc: boolean }

export async function sprawdzToken(token: string): Promise<WynikSprawdzenia> {
  let odpowiedz: Response
  try {
    odpowiedz = await fetch(`${SZKOPUL_URL}/api/auth_ping`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return {
      ok: false,
      powod: 'Nie udało się połączyć ze Szkopułem. Spróbuj za chwilę.',
      rozlaczyc: false,
    }
  }

  if (odpowiedz.status === 401 || odpowiedz.status === 403) {
    return {
      ok: false,
      powod: 'Szkopuł nie rozpoznaje tego tokenu. Wygeneruj go jeszcze raz i wklej ponownie.',
      rozlaczyc: true,
    }
  }

  if (!odpowiedz.ok) {
    return {
      ok: false,
      powod: `Szkopuł odpowiedział błędem (${odpowiedz.status}). Spróbuj za chwilę.`,
      rozlaczyc: false,
    }
  }

  const tresc = (await odpowiedz.json()) as unknown
  const username = typeof tresc === 'string' ? tresc.replace(/^pong\s*/i, '').trim() : ''

  return { ok: true, username: username || 'nieznany' }
}
