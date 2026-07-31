import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { SZKOPUL_URL } from '#services/szkopul'
import { pobierzToken } from '#services/szkopul_polaczenie'

export type Wynik = { score: number | null; status: string | null }

const TTL_MINUT = 1
const TIMEOUT_MS = 10_000
const KLUCZ_SESJI = 'szkopul_wyniki'
const KLUCZ_SESJI_CZAS = 'szkopul_wyniki_czas'

const wTrakcie = new Set<string>()

function odswiezWTle(klucz: string, praca: () => Promise<unknown>) {
  if (wTrakcie.has(klucz)) return
  wTrakcie.add(klucz)
  void praca()
    .catch(() => {})
    .finally(() => wTrakcie.delete(klucz))
}

type Cel = { idZadania: number; konkurs: string; pi: number; slug: string | null }

const MAX_DOPYTAN = 20
const RAZEM_DOPYTAN = 5

async function celeZadan(): Promise<Cel[]> {
  const wiersze = await db
    .from('lista_zadan')
    .select('id_zadania', 'szkopul_contest', 'szkopul_pi_id', 'szkopul_short_name')
    .whereNull('deleted_at')
    .whereNotNull('szkopul_contest')
    .whereNotNull('szkopul_pi_id')

  return wiersze.map((w) => ({
    idZadania: w.id_zadania,
    konkurs: String(w.szkopul_contest),
    pi: Number(w.szkopul_pi_id),
    slug: w.szkopul_short_name ?? null,
  }))
}

async function ostatnieZgloszenie(
  token: string,
  konkurs: string,
  slug: string
): Promise<Wynik | null> {
  try {
    const odp = await fetch(`${SZKOPUL_URL}/api/c/${konkurs}/problem_submission_list/${slug}/`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!odp.ok) return null

    const dane = (await odp.json()) as { submissions?: any[] }
    const zgloszenia = [...(dane.submissions ?? [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    if (zgloszenia.length === 0) return null

    return parsujWynik(zgloszenia[0])
  } catch {
    return null
  }
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
  const doDopytania: Cel[] = []

  for (const cel of cele) {
    const problem = poKonkursie.get(cel.konkurs)?.get(cel.pi)
    const wynik = parsujWynik(problem?.user_result)

    if (wynik) {
      wyniki.set(cel.idZadania, wynik)
      continue
    }
    if (problem && cel.slug) doDopytania.push(cel)
  }

  const partie = doDopytania.slice(0, MAX_DOPYTAN)
  for (let i = 0; i < partie.length; i += RAZEM_DOPYTAN) {
    const partia = partie.slice(i, i + RAZEM_DOPYTAN)
    const zgloszenia = await Promise.all(
      partia.map((cel) => ostatnieZgloszenie(token, cel.konkurs, cel.slug!))
    )
    partia.forEach((cel, j) => {
      const wynik = zgloszenia[j]
      if (wynik) wyniki.set(cel.idZadania, wynik)
    })
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

async function wynikiZBazy(idUzytkownika: number) {
  const wiersze = await db
    .from('wyniki_szkopul')
    .select('id_zadania', 'score', 'status')
    .where('id_uzytkownika', idUzytkownika)

  return new Map<number, Wynik>(
    wiersze.map((w) => [w.id_zadania, { score: w.score, status: w.status }])
  )
}

// Znacznik czasu stawiamy zawsze, także gdy Szkopuł nic nie zwrócił — inaczej
// użytkownik bez wyników odpytywałby API przy każdym wejściu na stronę.
async function odswiezDlaUzytkownika(idUzytkownika: number, token: string) {
  const cele = await celeZadan()
  const swiezo = await pobierzZeSzkopula(token, cele)

  if (swiezo.size > 0) await zapiszDlaUzytkownika(idUzytkownika, swiezo)

  await db
    .from('users')
    .where('id', idUzytkownika)
    .update({ szkopul_wyniki_odswiezone_at: DateTime.now().toSQL({ includeOffset: false }) })

  return swiezo
}

function swiezyZnacznik(znacznik: unknown) {
  if (!znacznik) return false
  const czas =
    znacznik instanceof DateTime ? znacznik : DateTime.fromJSDate(new Date(String(znacznik)))
  return czas.isValid && czas.diffNow('minutes').minutes > -TTL_MINUT
}

/**
 * Wyniki do pokazania. Strona nigdy nie czeka na Szkopuł: oddajemy to, co mamy
 * w cache, a nieświeże dane odświeżamy w tle, więc następne wejście jest już
 * aktualne. `wymus` (przycisk „odśwież") czeka na odpowiedź.
 */
export async function pobierzWyniki(
  ctx: HttpContext,
  opcje: { wymus?: boolean } = {}
): Promise<Map<number, Wynik>> {
  const token = pobierzToken(ctx)
  if (!token) return new Map()

  const user = ctx.auth.user

  if (user) {
    if (opcje.wymus) {
      await odswiezDlaUzytkownika(user.id, token)
      return wynikiZBazy(user.id)
    }

    const wyniki = await wynikiZBazy(user.id)
    if (!swiezyZnacznik(user.szkopulWynikiOdswiezoneAt)) {
      odswiezWTle(`u:${user.id}`, () => odswiezDlaUzytkownika(user.id, token))
    }
    return wyniki
  }

  // Gość trzyma cache w sesji, a sesji nie da się zapisać po odesłaniu
  // odpowiedzi — więc tu odświeżamy synchronicznie, inaczej wynik przepadłby.
  const czas = ctx.session.get(KLUCZ_SESJI_CZAS)
  const zapisane = ctx.session.get(KLUCZ_SESJI) as Record<string, [number | null, string | null]>

  if (!opcje.wymus && swiezyZnacznik(czas) && zapisane) {
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
  const user = ctx.auth.user
  if (user) {
    await db.from('wyniki_szkopul').where('id_uzytkownika', user.id).delete()
    // Bez zerowania znacznika po zmianie tokenu przez cały TTL nie odpytalibyśmy
    // Szkopuła — wyglądałoby to jak „konto podłączone, ale nic nie widać".
    await db.from('users').where('id', user.id).update({ szkopul_wyniki_odswiezone_at: null })
    user.szkopulWynikiOdswiezoneAt = null
  }
  ctx.session.forget(KLUCZ_SESJI)
  ctx.session.forget(KLUCZ_SESJI_CZAS)
}

export function czyZrobione(wynik: Wynik | undefined) {
  return Boolean(wynik && wynik.score !== null && wynik.score >= 100)
}

// Liczą się wyłącznie punkty. Statusu użyć się nie da: Szkopuł zwraca tu wynik
// testów przykładowych (`INI_OK` / `INI_ERR`), a nie akceptację — zadanie za 100
// i zadanie za 6 mają tak samo `INI_OK` (sprawdzone na żywych danych 31.07.2026).
// Statusu `OK` nie ma tam w ogóle.
//
// Próg 100 to założenie: API nie podaje maksymalnej liczby punktów — nie ma jej
// w żadnym endpoincie. We wszystkich sprawdzonych konkursach skala to 0-100.
export function czyRozwiazane(wynik: Wynik | undefined | null) {
  if (!wynik) return false
  return wynik.score !== null && wynik.score >= 100
}

export type Postep = { zrobione: number; wszystkich: number; procent: number }

type ZadanieDoPostepu = { idZadania: number; szkopulPiId: number | null }

export function policzPostep(
  zadania: ZadanieDoPostepu[],
  wyniki: Map<number, Wynik>,
  pomijane: Set<number> = new Set()
): Postep | null {
  const sledzone = new Map<number, ZadanieDoPostepu>()
  for (const z of zadania) {
    if (z.szkopulPiId === null || z.szkopulPiId === undefined) continue
    if (pomijane.has(z.idZadania)) continue
    sledzone.set(z.idZadania, z)
  }

  if (sledzone.size === 0) return null

  let zrobione = 0
  for (const id of sledzone.keys()) if (czyRozwiazane(wyniki.get(id))) zrobione++

  return {
    zrobione,
    wszystkich: sledzone.size,
    procent: Math.round((zrobione / sledzone.size) * 100),
  }
}

const OPISY_STATUSOW: Record<string, string> = {
  'OK': 'Rozwiązanie zaakceptowane',
  'WA': 'Zła odpowiedź',
  'TLE': 'Przekroczony limit czasu',
  'MLE': 'Przekroczony limit pamięci',
  'RE': 'Błąd wykonania',
  'RV': 'Naruszenie regulaminu',
  'CE': 'Błąd kompilacji',
  'IGN': 'Zgłoszenie zignorowane',
  'INI_OK': 'Testy przykładowe zaliczone',
  'INI_ERR': 'Testy przykładowe niezaliczone',
  '?': 'W trakcie sprawdzania',
}

export type Odznaka = { tekst: string; klasa: string; tytul: string }

export function odznakaWyniku(wynik: Wynik | undefined | null): Odznaka | null {
  if (!wynik) return null

  const opis = wynik.status ? (OPISY_STATUSOW[wynik.status] ?? wynik.status) : null

  if (wynik.score !== null) {
    return {
      tekst: String(wynik.score),
      klasa: wynik.score >= 100 ? 'pelny' : wynik.score > 0 ? 'czesciowy' : 'zerowy',
      tytul: opis ? `${wynik.score} pkt - ${opis}` : `${wynik.score} pkt`,
    }
  }

  if (!wynik.status) return null
  return {
    tekst: wynik.status,
    klasa: wynik.status === '?' ? 'oczekuje' : 'blad',
    tytul: opis ?? wynik.status,
  }
}
