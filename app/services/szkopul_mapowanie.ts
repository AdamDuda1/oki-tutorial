import db from '@adonisjs/lucid/services/db'
import { SZKOPUL_URL } from '#services/szkopul'

const TIMEOUT_MS = 15_000

export type Cel = {
  id: number
  nazwa: string
  konkurs: string
  pi?: number
  short?: string
}

export type Dopasowane = {
  id: number
  nazwa: string
  konkurs: string
  pi: number
  short: string
  bylo: { konkurs: string | null; pi: number | null; short: string | null }
}

export type Raport = {
  wszystkich: number
  konkursy: { konkurs: string; problemowWApi: number; nasze: number; dopasowane: number }[]
  doZapisu: Dopasowane[]
  bezZmian: Dopasowane[]
  bezDopasowania: string[]
  pozaSzkopulem: string[]
  duplikaty: { klucz: string; zadania: string[] }[]
  bledy: string[]
}

export function celZLinku(link: string): Omit<Cel, 'id' | 'nazwa'> | null {
  const przezId = link.match(/\/c\/([a-z0-9_-]+)\/submit\/(\d+)\/?/i)
  if (przezId) return { konkurs: przezId[1], pi: Number(przezId[2]) }

  const przezSlug = link.match(/\/c\/([a-z0-9_-]+)\/p\/([a-z0-9_-]+)\/?/i)
  if (przezSlug) return { konkurs: przezSlug[1], short: przezSlug[2] }

  return null
}

type Problemy =
  | { ok: true; poId: Map<number, any>; poShort: Map<string, any>; ile: number }
  | { ok: false; powod: string }

async function pobierzProblemy(token: string, konkurs: string): Promise<Problemy> {
  try {
    const odp = await fetch(`${SZKOPUL_URL}/api/c/${konkurs}/problem_list/`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!odp.ok) {
      const powod =
        odp.status === 403
          ? 'nie jesteś zapisany na ten konkurs'
          : odp.status === 401
            ? 'Szkopuł nie rozpoznaje tokenu'
            : `HTTP ${odp.status}`
      return { ok: false, powod }
    }
    const problemy = (await odp.json()) as any[]
    return {
      ok: true,
      poId: new Map(problemy.map((p) => [p.id, p])),
      poShort: new Map(problemy.map((p) => [p.short_name, p])),
      ile: problemy.length,
    }
  } catch {
    return { ok: false, powod: 'Szkopuł nie odpowiedział' }
  }
}

export async function przygotujMapowanie(token: string): Promise<Raport> {
  const zadania = await db
    .from('lista_zadan')
    .select(
      'id_zadania',
      'nazwa',
      'link_wyslij',
      'szkopul_contest',
      'szkopul_pi_id',
      'szkopul_short_name'
    )
    .whereNull('deleted_at')
    .orderBy('id_zadania')

  const cele: Cel[] = []
  const pozaSzkopulem: string[] = []
  const stan = new Map<number, Dopasowane['bylo']>()

  for (const z of zadania) {
    stan.set(z.id_zadania, {
      konkurs: z.szkopul_contest ?? null,
      pi: z.szkopul_pi_id ?? null,
      short: z.szkopul_short_name ?? null,
    })

    const opis = `#${z.id_zadania} ${z.nazwa}`
    const link: string = z.link_wyslij ?? ''
    const cel = celZLinku(link)

    if (!cel) {
      pozaSzkopulem.push(`${opis} → ${link || '(pusty link)'}`)
      continue
    }
    cele.push({ id: z.id_zadania, nazwa: z.nazwa, ...cel })
  }

  const raport: Raport = {
    wszystkich: zadania.length,
    konkursy: [],
    doZapisu: [],
    bezZmian: [],
    bezDopasowania: [],
    pozaSzkopulem,
    duplikaty: [],
    bledy: [],
  }

  for (const konkurs of [...new Set(cele.map((c) => c.konkurs))].sort()) {
    const nasze = cele.filter((c) => c.konkurs === konkurs)

    const wynik = await pobierzProblemy(token, konkurs)
    if (!wynik.ok) {
      raport.bledy.push(`${konkurs}: ${wynik.powod}, pomijam`)
      for (const c of nasze) raport.bezDopasowania.push(`#${c.id} ${c.nazwa} → ${wynik.powod}`)
      continue
    }

    const { poId, poShort } = wynik
    let dopasowane = 0

    for (const c of nasze) {
      const p = c.pi !== undefined ? poId.get(c.pi) : poShort.get(c.short!)
      if (!p) {
        raport.bezDopasowania.push(
          `#${c.id} ${c.nazwa} → ${konkurs}/${c.pi ?? c.short} nie ma w API`
        )
        continue
      }
      dopasowane++

      const bylo = stan.get(c.id)!
      const wpis: Dopasowane = {
        id: c.id,
        nazwa: c.nazwa,
        konkurs,
        pi: p.id,
        short: p.short_name,
        bylo,
      }

      const bezZmiany = bylo.konkurs === konkurs && bylo.pi === p.id && bylo.short === p.short_name
      if (bezZmiany) raport.bezZmian.push(wpis)
      else raport.doZapisu.push(wpis)
    }

    raport.konkursy.push({
      konkurs,
      problemowWApi: wynik.ile,
      nasze: nasze.length,
      dopasowane,
    })
  }

  const poPi = new Map<string, Dopasowane[]>()
  for (const w of [...raport.doZapisu, ...raport.bezZmian]) {
    const klucz = `${w.konkurs}/${w.pi}`
    if (!poPi.has(klucz)) poPi.set(klucz, [])
    poPi.get(klucz)!.push(w)
  }
  raport.duplikaty = [...poPi.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([klucz, v]) => ({ klucz, zadania: v.map((w) => `#${w.id} ${w.nazwa}`) }))

  return raport
}

export type Mapowanie = {
  szkopulContest: string | null
  szkopulPiId: number | null
  szkopulShortName: string | null
}

const PUSTE: Mapowanie = { szkopulContest: null, szkopulPiId: null, szkopulShortName: null }

function rozne(a: Mapowanie, b: Mapowanie) {
  return (
    a.szkopulContest !== b.szkopulContest ||
    a.szkopulPiId !== b.szkopulPiId ||
    a.szkopulShortName !== b.szkopulShortName
  )
}

export async function mapowanieDlaZapisu(opts: {
  link: string | null | undefined
  podane: Mapowanie
  poprzednie?: Mapowanie
  token: string | null
}): Promise<Mapowanie> {
  const { link, podane, poprzednie = PUSTE, token } = opts

  if (rozne(podane, poprzednie)) return podane

  const cel = celZLinku(link ?? '')
  if (!cel) return podane

  const wynik: Mapowanie = {
    szkopulContest: cel.konkurs,
    szkopulPiId: cel.pi ?? null,
    szkopulShortName: cel.short ?? null,
  }

  if (token && (!wynik.szkopulShortName || !wynik.szkopulPiId)) {
    const problemy = await pobierzProblemy(token, cel.konkurs)
    if (problemy.ok) {
      const p = cel.pi !== undefined ? problemy.poId.get(cel.pi) : problemy.poShort.get(cel.short!)
      if (p) {
        wynik.szkopulPiId = p.id
        wynik.szkopulShortName = p.short_name
      }
    }
  }

  return wynik
}

export async function mapowanieDlaImportu(
  linki: (string | null | undefined)[],
  token: string | null
): Promise<Mapowanie[]> {
  const cele = linki.map((l) => celZLinku(l ?? ''))

  const problemyKonkursu = new Map<string, Problemy>()
  if (token) {
    for (const konkurs of new Set(cele.filter(Boolean).map((c) => c!.konkurs))) {
      problemyKonkursu.set(konkurs, await pobierzProblemy(token, konkurs))
    }
  }

  return cele.map((cel) => {
    if (!cel) return { ...PUSTE }

    const wynik: Mapowanie = {
      szkopulContest: cel.konkurs,
      szkopulPiId: cel.pi ?? null,
      szkopulShortName: cel.short ?? null,
    }

    const problemy = problemyKonkursu.get(cel.konkurs)
    if (problemy?.ok) {
      const p = cel.pi !== undefined ? problemy.poId.get(cel.pi) : problemy.poShort.get(cel.short!)
      if (p) {
        wynik.szkopulPiId = p.id
        wynik.szkopulShortName = p.short_name
      }
    }
    return wynik
  })
}

export type Sprawdzenie = {
  stan: 'ok' | 'uwaga' | 'blad' | 'nieznane' | 'brak'
  tytul: string
  szczegoly: string[]
}

async function pobierzProblem(
  token: string,
  konkurs: string,
  short: string
): Promise<{ ok: true; dane: any } | { ok: false; status: number | null }> {
  try {
    const odp = await fetch(
      `${SZKOPUL_URL}/api/c/${konkurs}/problems/${encodeURIComponent(short)}/`,
      {
        headers: { Authorization: `Token ${token}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    )
    if (!odp.ok) return { ok: false, status: odp.status }
    return { ok: true, dane: await odp.json() }
  } catch {
    return { ok: false, status: null }
  }
}

async function podpowiedzDlaNumeru(
  token: string,
  konkurs: string,
  pi: number | null
): Promise<{ zdanie: string | null; short: string | null }> {
  if (!pi) return { zdanie: null, short: null }

  const problemy = await pobierzProblemy(token, konkurs)
  if (!problemy.ok) return { zdanie: null, short: null }

  const p = problemy.poId.get(pi)
  if (!p) {
    return {
      zdanie: `Nie znaleziono ${pi} w tym konkursie.`,
      short: null,
    }
  }
  return {
    zdanie: `Znaleziono ${pi} jako „${p.short_name}”.`,
    short: p.short_name as string,
  }
}

function powodHttp(status: number | null): string {
  if (status === 401) return 'Szkopuł nie rozpoznaje Twojego tokenu'
  if (status === 403) return 'nie jesteś zapisany na ten konkurs'
  if (status === null) return 'Szkopuł nie odpowiedział'
  return `HTTP ${status}`
}

export async function sprawdzZadanie(opts: {
  konkurs: string | null
  pi: number | null
  short: string | null
  link: string | null
  token: string | null
}): Promise<Sprawdzenie> {
  const { konkurs, pi, short, link, token } = opts

  if (!konkurs && !pi && !short) {
    const zLinku = celZLinku(link ?? '')
    if (zLinku) {
      return {
        stan: 'uwaga',
        tytul: 'Link prowadzi na Szkopuł, ale pola poniżej są puste.',
        szczegoly: [
          `Z linku da się odczytać konkurs ${zLinku.konkurs}${zLinku.pi ? ` i problem ${zLinku.pi}` : ''}. Zapisz zadanie ponownie, a wypełnią się same.`,
        ],
      }
    }
    return {
      stan: 'brak',
      tytul: 'Zadanie nie jest na Szkopule.',
      szczegoly: ['Postęp i wynik przy tym zadaniu się nie pokażą.'],
    }
  }

  if (!konkurs) {
    return {
      stan: 'blad',
      tytul: 'Brakuje konkursu.',
      szczegoly: ['...'],
    }
  }

  if (!pi && !short) {
    return {
      stan: 'blad',
      tytul: 'Jest konkurs, ale nic więcej...',
      szczegoly: ['Uzupełnij numer problemu z linku /submit/.../ lub z edycji zadania (także po dodaniu).'],
    }
  }

  if (!token) {
    return {
      stan: 'nieznane',
      tytul: 'Połącz konto ze szkopułem w ustawieniach.',
      szczegoly: ['w /konto'],
    }
  }

  if (short) {
    const odp = await pobierzProblem(token, konkurs, short)

    if (!odp.ok && odp.status === 404) {
      const podpowiedz = await podpowiedzDlaNumeru(token, konkurs, pi)

      return {
        stan: 'blad',
        tytul: `W konkursie ${konkurs} nie ma zadania ze skrótem „${short}”.`,
        szczegoly: [
          'Skrót albo konkurs jest zły.',
          ...(podpowiedz.zdanie ? [podpowiedz.zdanie] : []),
          ...(podpowiedz.short
            ? [`Prawdopodobnie skrót powinien brzmieć „${podpowiedz.short}”.`]
            : []),
        ],
      }
    }
    if (!odp.ok) {
      return {
        stan: 'nieznane',
        tytul: `err ${powodHttp(odp.status)} :((`,
        szczegoly: [],
      }
    }

    const piZApi = odp.dane.problem_instance_id as number | undefined
    if (!pi) {
      return {
        stan: 'uwaga',
        tytul: `Skrót „${short}” istnieje w konkursie ${konkurs}, ale brakuje ID.`,
        szczegoly: [`Według API to ${piZApi ?? '?'}.`],
      }
    }
    if (piZApi !== pi) {
      const podpowiedz = await podpowiedzDlaNumeru(token, konkurs, pi)

      return {
        stan: 'blad',
        tytul: `ID problemu się nie zgadza: zapisane ${pi}, a API daje ${piZApi ?? '?'}.`,
        szczegoly: [
          `Link "wyślij" prowadzi do innego zadania niż skrót „${short}”.`,
          ...(podpowiedz.zdanie ? [podpowiedz.zdanie] : []),
          podpowiedz.short
            ? `Popraw jedno z dwojga: id na ${piZApi}, jeśli chodziło o "${short}", albo skrót na „${podpowiedz.short}”, jeśli o problem ${pi}.`
            : `Jeśli skrót jest dobry, wpisz id ${piZApi}.`,
        ],
      }
    }
    return {
      stan: 'ok',
      tytul: `Zgadza się z API: ${konkurs} / problem ${pi} / „${short}”.`,
      szczegoly: [],
    }
  }

  const problemy = await pobierzProblemy(token, konkurs)
  if (!problemy.ok) {
    return {
      stan: 'nieznane',
      tytul: `Nie udało się sprawdzić: ${problemy.powod}.`,
      szczegoly: [
        'bardzo możliwe że to wina szkopuła',
      ],
    }
  }

  const p = problemy.poId.get(pi!)
  if (!p) {
    return {
      stan: 'blad',
      tytul: `W konkursie ${konkurs} nie ma problemu o id ${pi}.`,
      szczegoly: [`API zna ${problemy.ile} problemów w tym konkursie.`],
    }
  }
  return {
    stan: 'uwaga',
    tytul: `Konkurs i id problemu się zgadzają, ale brakuje skrótu.`,
    szczegoly: [
      `Według API to "${p.short_name}".`,
    ],
  }
}

export async function zapiszMapowanie(doZapisu: Dopasowane[]): Promise<number> {
  for (const w of doZapisu) {
    await db.from('lista_zadan').where('id_zadania', w.id).update({
      szkopul_contest: w.konkurs,
      szkopul_pi_id: w.pi,
      szkopul_short_name: w.short,
    })
  }
  return doZapisu.length
}
