import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { SZKOPUL_URL } from '#services/szkopul'
import { pobierzToken } from '#services/szkopul_polaczenie'

export type Wynik = { score: number | null; status: string | null }

const TTL_MINUT = 10
const TIMEOUT_MS = 10_000
const KLUCZ_SESJI = 'szkopul_wyniki'
const KLUCZ_SESJI_CZAS = 'szkopul_wyniki_czas'

type Cel = { idZadania: number; konkurs: string; pi: number }

async function celeZadan(): Promise<Cel[]> {
  const wiersze = await db
    .from('lista_zadan')
    .select('id_zadania', 'szkopul_contest', 'szkopul_pi_id')
    .whereNull('deleted_at')
    .whereNotNull('szkopul_contest')
    .whereNotNull('szkopul_pi_id')

  return wiersze.map((w) => ({
    idZadania: w.id_zadania,
    konkurs: String(w.szkopul_contest),
    pi: Number(w.szkopul_pi_id),
  }))
}

async function pobierzZeSzkopula(token: string, cele: Cel[]): Promise<Map<number, Wynik>> {
  const konkursy = [...new Set(cele.map((c) => c.konkurs))]

  const odpowiedzi = await Promise.all(
    konkursy.map(async (konkurs) => {
      try {
        const odp = await fetch(`${SZKOPUL_URL}/api/c/${konkurs}/problem_list/`, {
          headers: { Authorization: `Token ${token}` },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!odp.ok) return { konkurs, problemy: [] as any[] }
        return { konkurs, problemy: (await odp.json()) as any[] }
      } catch {
        return { konkurs, problemy: [] as any[] }
      }
    })
  )

  const poKonkursie = new Map(
    odpowiedzi.map((o) => [o.konkurs, new Map(o.problemy.map((p) => [p.id, p]))])
  )

  const wyniki = new Map<number, Wynik>()
  for (const cel of cele) {
    const problem = poKonkursie.get(cel.konkurs)?.get(cel.pi)
    const wynik = parsujWynik(problem?.user_result)
    if (wynik) wyniki.set(cel.idZadania, wynik)
  }

  return wyniki
}

export function parsujWynik(surowy: any): Wynik | null {
  if (!surowy) return null

  const tekst =
    surowy.score === null || surowy.score === undefined ? '' : String(surowy.score).trim()
  const liczba = tekst === '' ? Number.NaN : Number(tekst)
  const score = Number.isFinite(liczba) ? liczba : null
  const status = surowy.status ?? null

  if (score === null && status === null) return null

  return { score, status }
}

async function zapiszDlaUzytkownika(idUzytkownika: number, wyniki: Map<number, Wynik>) {
  const teraz = DateTime.now().toSQL({ includeOffset: false })
  for (const [idZadania, wynik] of wyniki) {
    await db
      .table('wyniki_szkopul')
      .insert({
        id_uzytkownika: idUzytkownika,
        id_zadania: idZadania,
        score: wynik.score,
        status: wynik.status,
        created_at: teraz,
        updated_at: teraz,
      })
      .onConflict(['id_uzytkownika', 'id_zadania'])
      .merge(['score', 'status', 'updated_at'])
  }
}

async function czyISwiezeDlaUzytkownika(idUzytkownika: number) {
  const wiersze = await db
    .from('wyniki_szkopul')
    .select('id_zadania', 'score', 'status', 'updated_at')
    .where('id_uzytkownika', idUzytkownika)

  const wyniki = new Map<number, Wynik>(
    wiersze.map((w) => [w.id_zadania, { score: w.score, status: w.status }])
  )

  if (wiersze.length === 0) return { wyniki, swieze: false }

  const najnowszy = wiersze
    .map((w) => DateTime.fromJSDate(new Date(w.updated_at)))
    .reduce((a, b) => (a > b ? a : b))

  return { wyniki, swieze: najnowszy.diffNow('minutes').minutes > -TTL_MINUT }
}

export async function pobierzWyniki(ctx: HttpContext): Promise<Map<number, Wynik>> {
  const token = pobierzToken(ctx)
  if (!token) return new Map()

  const user = ctx.auth.user

  if (user) {
    const { wyniki, swieze } = await czyISwiezeDlaUzytkownika(user.id)
    if (swieze) return wyniki

    const cele = await celeZadan()
    const swiezo = await pobierzZeSzkopula(token, cele)
    if (swiezo.size === 0) return wyniki

    await zapiszDlaUzytkownika(user.id, swiezo)
    return swiezo
  }

  const czas = ctx.session.get(KLUCZ_SESJI_CZAS)
  const zapisane = ctx.session.get(KLUCZ_SESJI) as Record<string, [number | null, string | null]>
  const swieze = czas && DateTime.fromISO(String(czas)).diffNow('minutes').minutes > -TTL_MINUT

  if (swieze && zapisane) {
    return new Map(
      Object.entries(zapisane).map(([id, [score, status]]) => [Number(id), { score, status }])
    )
  }

  const cele = await celeZadan()
  const swiezo = await pobierzZeSzkopula(token, cele)

  ctx.session.put(
    KLUCZ_SESJI,
    Object.fromEntries([...swiezo].map(([id, w]) => [String(id), [w.score, w.status]]))
  )
  ctx.session.put(KLUCZ_SESJI_CZAS, DateTime.now().toISO())

  return swiezo
}

export async function wyczyscWyniki(ctx: HttpContext) {
  if (ctx.auth.user) {
    await db.from('wyniki_szkopul').where('id_uzytkownika', ctx.auth.user.id).delete()
  }
  ctx.session.forget(KLUCZ_SESJI)
  ctx.session.forget(KLUCZ_SESJI_CZAS)
}

export function czyZrobione(wynik: Wynik | undefined) {
  return Boolean(wynik && wynik.score !== null && wynik.score >= 100)
}
