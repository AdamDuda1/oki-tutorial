import { DateTime } from 'luxon'
import env from '#start/env'
import { parseCsv } from '#services/csv'

export const KONTAKT_CSV_URL = env.get('KONTAKT_CSV_URL')

const TIMEOUT_MS = 10_000
const CACHE_MS = 5 * 60 * 1000

export type Zgloszenie = {
  data: DateTime | null
  dataTekst: string
  email: string
  rodzaj: string
  wiadomosc: string
  linkZadania: string
  kody: string
  omowienie: string
  hinty: string
  zgoda: string
  zakresPomocy: string
  dodatkowe: Array<{ naglowek: string; wartosc: string }>
}

const KOLUMNY: Record<string, string[]> = {
  zgoda: ['chce otrzymywac'],
  zakresPomocy: ['zakresie'],
  dataTekst: ['timestamp', 'sygnatura czasowa'],
  email: ['email', 'adres e-mail'],
  linkZadania: ['link do zadania'],
  kody: ['kody'],
  omowienie: ['omowienie'],
  hinty: ['hinty'],
  rodzaj: ['co chcesz zrobic'],
  wiadomosc: ['wiadomosc'],
}

let cache: { czas: number; zgloszenia: Zgloszenie[] } | null = null

function normalizuj(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const FORMATY_DATY = ['M/d/yyyy H:mm:ss', 'd.M.yyyy H:mm:ss', 'yyyy-MM-dd HH:mm:ss']

function parsujDate(tekst: string): DateTime | null {
  if (!tekst) return null

  for (const format of FORMATY_DATY) {
    const data = DateTime.fromFormat(tekst.trim(), format)
    if (data.isValid) return data
  }

  const iso = DateTime.fromISO(tekst.trim())
  return iso.isValid ? iso : null
}

function zmapujNaglowki(naglowki: string[]): {
  pola: Record<string, number>
  reszta: number[]
} {
  const znormalizowane = naglowki.map(normalizuj)
  const pola: Record<string, number> = {}
  const zajete = new Set<number>()

  for (const [pole, fragmenty] of Object.entries(KOLUMNY)) {
    const index = znormalizowane.findIndex(
      (naglowek, i) => !zajete.has(i) && fragmenty.some((f) => naglowek.includes(f))
    )
    if (index !== -1) {
      pola[pole] = index
      zajete.add(index)
    }
  }

  const reszta = naglowki
    .map((_, i) => i)
    .filter((i) => !zajete.has(i) && naglowki[i].trim() !== '')
  return { pola, reszta }
}

export function zbudujZgloszenia(csv: string): Zgloszenie[] {
  const wiersze = parseCsv(csv)
  if (wiersze.length === 0) return []

  const [naglowki, ...dane] = wiersze
  const { pola, reszta } = zmapujNaglowki(naglowki)
  const wez = (wiersz: string[], pole: string) =>
    pola[pole] === undefined ? '' : (wiersz[pola[pole]] ?? '').trim()

  const zgloszenia = dane
    .filter((wiersz) => wiersz.some((komorka) => komorka.trim() !== ''))
    .map((wiersz) => {
      const dataTekst = wez(wiersz, 'dataTekst')
      return {
        data: parsujDate(dataTekst),
        dataTekst,
        email: wez(wiersz, 'email'),
        rodzaj: wez(wiersz, 'rodzaj'),
        wiadomosc: wez(wiersz, 'wiadomosc'),
        linkZadania: wez(wiersz, 'linkZadania'),
        kody: wez(wiersz, 'kody'),
        omowienie: wez(wiersz, 'omowienie'),
        hinty: wez(wiersz, 'hinty'),
        zgoda: wez(wiersz, 'zgoda'),
        zakresPomocy: wez(wiersz, 'zakresPomocy'),
        dodatkowe: reszta
          .map((i) => ({ naglowek: naglowki[i].trim(), wartosc: (wiersz[i] ?? '').trim() }))
          .filter((k) => k.wartosc !== ''),
      }
    })

  return zgloszenia.sort((a, b) => (b.data?.toMillis() ?? -1) - (a.data?.toMillis() ?? -1))
}

export async function pobierzZgloszenia(
  opcje: { pomijCache?: boolean } = {}
): Promise<Zgloszenie[]> {
  if (!KONTAKT_CSV_URL) {
    throw new Error(
      'Brak adresu arkusza. Ustaw KONTAKT_CSV_URL na opublikowany CSV z odpowiedziami formularza.'
    )
  }

  if (!opcje.pomijCache && cache && Date.now() - cache.czas < CACHE_MS) {
    return cache.zgloszenia
  }

  let odpowiedz: Response
  try {
    odpowiedz = await fetch(KONTAKT_CSV_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    throw new Error('Nie udało się połączyć z arkuszem Google. Spróbuj za chwilę.')
  }

  if (!odpowiedz.ok) {
    throw new Error(
      `Arkusz odpowiedział ${odpowiedz.status}. Sprawdź, czy publikacja w internecie jest nadal włączona.`
    )
  }

  const zgloszenia = zbudujZgloszenia(await odpowiedz.text())
  cache = { czas: Date.now(), zgloszenia }
  return zgloszenia
}

export function wiekCache(): number | null {
  return cache ? Date.now() - cache.czas : null
}

export type Kategoria = 'wiadomosc' | 'noweZadanie' | 'pomoc' | 'poprawka' | 'nieznana'

const KATEGORIE: Array<[Kategoria, string[]]> = [
  ['noweZadanie', ['nowego zadania', 'zglos zadanie']],
  ['pomoc', ['chce pomoc']],
  ['poprawka', ['poprawki', 'bledu', 'blad', 'bug']],
  ['wiadomosc', ['cos innego', 'pytanie', 'nowych tresci', 'usprawnieni', 'inne']],
]

export function kategoriaZgloszenia(rodzaj: string): Kategoria {
  const nazwa = normalizuj(rodzaj)
  if (!nazwa) return 'nieznana'
  for (const [kategoria, fragmenty] of KATEGORIE) {
    if (fragmenty.some((fragment) => nazwa.includes(fragment))) return kategoria
  }
  return 'nieznana'
}

export type TypPola = 'tekst' | 'kod' | 'link'
export type Pole = { klucz: string; etykieta: string; wartosc: string; typ: TypPola }

const ETYKIETY: Record<string, { etykieta: string; typ: TypPola }> = {
  wiadomosc: { etykieta: 'Wiadomość', typ: 'tekst' },
  linkZadania: { etykieta: 'Link do zadania', typ: 'link' },
  kody: { etykieta: 'Kod(y)', typ: 'kod' },
  omowienie: { etykieta: 'Omówienie', typ: 'kod' },
  hinty: { etykieta: 'Hinty / uwagi / linki', typ: 'tekst' },
  zakresPomocy: { etykieta: 'Zakres pomocy', typ: 'tekst' },
  zgoda: { etykieta: 'Zgoda na powiadomienia e-mail', typ: 'tekst' },
}

const KOLEJNOSC = Object.keys(ETYKIETY)

const POLA_KATEGORII: Record<Kategoria, string[] | null> = {
  wiadomosc: ['wiadomosc'],
  noweZadanie: ['linkZadania', 'kody', 'omowienie', 'hinty', 'zgoda'],
  pomoc: ['zakresPomocy'],
  poprawka: null,
  nieznana: null,
}

export type Karta = Zgloszenie & {
  kategoria: Kategoria
  pola: Pole[]
  pozostale: Pole[]
  mailto: string
}

const MAKS_CYTAT = 600

export function mailtoOdpowiedz(z: Zgloszenie, podpis = ''): string {
  if (!z.email) return ''

  const temat = z.rodzaj ? `Odp.: ${z.rodzaj}` : 'Odp.: Twoje zgłoszenie'
  const kiedy = z.data ? z.data.setLocale('pl').toFormat('d.LL.yyyy HH:mm') : z.dataTekst
  const zrodlo = [z.wiadomosc, z.zakresPomocy, z.linkZadania].find(Boolean) ?? ''
  const cytat = zrodlo
    .slice(0, MAKS_CYTAT)
    .split('\n')
    .map((linia) => `> ${linia}`)
    .join('\n')

  const tresc = [
    'Cześć,',
    '',
    '',
    ...(podpis ? ['Pozdrawiam,', podpis, ''] : []),
    `- w odpowiedzi na zgłoszenie z ${kiedy || 'formularza'}:`,
    cytat,
  ].join('\n')

  const adres = encodeURIComponent(z.email).replace(/%40/g, '@')
  return `mailto:${adres}?subject=${encodeURIComponent(temat)}&body=${encodeURIComponent(tresc)}`
}

export function ulozKarte(z: Zgloszenie, podpis = ''): Karta {
  const kategoria = kategoriaZgloszenia(z.rodzaj)
  const wybrane = POLA_KATEGORII[kategoria]

  const wartosci: Record<string, string> = {
    wiadomosc: z.wiadomosc,
    linkZadania: z.linkZadania,
    kody: z.kody,
    omowienie: z.omowienie,
    hinty: z.hinty,
    zakresPomocy: z.zakresPomocy,
    zgoda: z.zgoda,
  }
  const znane: Pole[] = KOLEJNOSC.filter((klucz) => wartosci[klucz]).map((klucz) => ({
    klucz,
    etykieta: ETYKIETY[klucz].etykieta,
    typ: ETYKIETY[klucz].typ,
    wartosc: wartosci[klucz],
  }))
  const dodatkowe: Pole[] = z.dodatkowe.map((d) => ({
    klucz: d.naglowek,
    etykieta: d.naglowek,
    wartosc: d.wartosc,
    typ: 'tekst' as TypPola,
  }))

  const mailto = mailtoOdpowiedz(z, podpis)
  if (wybrane === null) {
    return { ...z, kategoria, pola: [...znane, ...dodatkowe], pozostale: [], mailto }
  }

  return {
    ...z,
    kategoria,
    pola: wybrane.flatMap((klucz) => znane.filter((pole) => pole.klucz === klucz)),
    pozostale: [...znane.filter((pole) => !wybrane.includes(pole.klucz)), ...dodatkowe],
    mailto,
  }
}
