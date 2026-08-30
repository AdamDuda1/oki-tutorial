import sanitizeHtml from 'sanitize-html'

// tak, masz mnie. to napisało ai.

export class BladTresci extends Error {}

export const DOZWOLONE_KOMPONENTY = new Set([
  'custom.header',
  'custom.link',
  'custom.callout',
  'custom.code',
  'custom.modalLink',
  'custom.sciezka.expandableBox',
])

const PROPSY_TEKSTOWE = new Set(['code', 'body'])
const PROPSY_URL = new Set(['href', 'src'])

const SCHEMATY = ['http', 'https', 'mailto']

const ATRYBUTY_WSPOLNE = ['class', 'style', 'id', 'title']

const KONFIG_BLOKOWY: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'br',
    'span',
    'figure',
    'figcaption',
    'details',
    'summary',
    'iframe',
    'picture',
    'video',
    'audio',
    'source',
    'track',
    'del',
    'ins',
  ],
  allowedAttributes: {
    '*': ATRYBUTY_WSPOLNE,
    'a': ['href', 'name', 'target', 'rel'],
    'img': ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
    'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    'video': [
      'src',
      'poster',
      'controls',
      'width',
      'height',
      'preload',
      'loop',
      'muted',
      'playsinline',
    ],
    'audio': ['src', 'controls', 'preload', 'loop', 'muted'],
    'source': ['src', 'srcset', 'sizes', 'type', 'media'],
    'track': ['src', 'kind', 'srclang', 'label', 'default'],
    'details': ['open'],
    'ol': ['start', 'type', 'reversed'],
    'td': ['colspan', 'rowspan', 'headers'],
    'th': ['colspan', 'rowspan', 'headers', 'scope'],
    'del': ['datetime', 'cite'],
    'ins': ['datetime', 'cite'],
  },
  allowedSchemes: SCHEMATY,
  allowedSchemesAppliedToAttributes: ['href', 'src', 'srcset'],
  allowedIframeHostnames: [
    'www.youtube.com',
    'youtube.com',
    'www.youtube-nocookie.com',
    'player.vimeo.com',
  ],
  disallowedTagsMode: 'discard',
}

const KONFIG_LINIOWY: sanitizeHtml.IOptions = {
  ...KONFIG_BLOKOWY,
  allowedTags: [
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'code',
    'sub',
    'sup',
    'br',
    'span',
    'a',
    'small',
    'mark',
    'kbd',
    'samp',
    'var',
    'abbr',
    'q',
    'time',
    'del',
    'ins',
  ],
  allowedAttributes: {
    '*': ATRYBUTY_WSPOLNE,
    'a': ['href', 'target', 'rel'],
  },
}

export function oczyscBlok(html: string): string {
  return sanitizeHtml(html, KONFIG_BLOKOWY)
}

export function escapujHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}

export function oczyscLinie(html: string | null | undefined): string | null {
  if (!html) return null
  return sanitizeHtml(html, KONFIG_LINIOWY)
}

function bezpiecznyUrl(wartosc: unknown): string {
  const s = String(wartosc ?? '').trim()
  if (s.startsWith('/') || s.startsWith('#')) return s
  try {
    const schemat = new URL(s).protocol.replace(':', '').toLowerCase()
    return SCHEMATY.includes(schemat) ? s : '#'
  } catch {
    return '#'
  }
}

export type Wezel =
  | { typ: 'html'; tresc: string }
  | { typ: 'komponent'; nazwa: string; propsy: Record<string, unknown>; dzieci: Wezel[] }

const OTWARCIE = /^@(!?)(custom(?:\.[A-Za-z][A-Za-z0-9]*)+)\s*\(/

function odkodujTekst(s: string): string {
  return s.replace(/\\([\\'"`nrt])/g, (_, z) => {
    if (z === 'n') return '\n'
    if (z === 'r') return '\r'
    if (z === 't') return '\t'
    return z
  })
}

function koniecNawiasu(src: string, otwarcie: number): number {
  let glebokosc = 0
  let cudzyslow: string | null = null
  for (let i = otwarcie; i < src.length; i++) {
    const c = src[i]
    if (cudzyslow) {
      if (c === '\\') i++
      else if (c === cudzyslow) cudzyslow = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') cudzyslow = c
    else if (c === '(') glebokosc++
    else if (c === ')' && --glebokosc === 0) return i
  }
  return -1
}

function podzielArgumenty(s: string): string[] {
  const czesci: string[] = []
  let biezaca = ''
  let cudzyslow: string | null = null
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (cudzyslow) {
      biezaca += c
      if (c === '\\' && i + 1 < s.length) biezaca += s[++i]
      else if (c === cudzyslow) cudzyslow = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      cudzyslow = c
      biezaca += c
    } else if (c === ',') {
      czesci.push(biezaca)
      biezaca = ''
    } else {
      biezaca += c
    }
  }
  if (biezaca.trim()) czesci.push(biezaca)
  return czesci
}

function parsujWartosc(zrodlo: string): unknown {
  const t = zrodlo.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)

  const q = t[0]
  if ((q === "'" || q === '"' || q === '`') && t.length >= 2 && t[t.length - 1] === q) {
    return odkodujTekst(t.slice(1, -1))
  }
  throw new BladTresci(`w propsach dozwolone są tylko wartości stałe, a jest: ${t}`)
}

export function parsujPropsy(zrodlo: string): Record<string, unknown> {
  const s = zrodlo.trim()
  if (!s) return {}
  if (!s.startsWith('{') || !s.endsWith('}')) {
    throw new BladTresci('propsy trzeba podać jako { klucz: wartość }')
  }

  const propsy: Record<string, unknown> = {}
  for (const czesc of podzielArgumenty(s.slice(1, -1))) {
    if (!czesc.trim()) continue
    const podzial = czesc.indexOf(':')
    if (podzial === -1) throw new BladTresci(`brakuje dwukropka w propsie: ${czesc.trim()}`)

    let klucz = czesc.slice(0, podzial).trim()
    if (/^['"`].*['"`]$/.test(klucz)) klucz = klucz.slice(1, -1)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(klucz)) {
      throw new BladTresci(`niepoprawna nazwa propsa: ${klucz}`)
    }

    const wartosc = parsujWartosc(czesc.slice(podzial + 1))
    propsy[klucz] = typeof wartosc !== 'string' ? wartosc : oczyscProps(klucz, wartosc)
  }
  return propsy
}

function oczyscProps(klucz: string, wartosc: string): string {
  if (PROPSY_URL.has(klucz)) return bezpiecznyUrl(wartosc)
  if (PROPSY_TEKSTOWE.has(klucz)) return wartosc
  return oczyscLinie(wartosc) ?? ''
}

function parsuj(src: string, start: number, wOczekiwaniuEnd: boolean) {
  const wezly: Wezel[] = []
  let bufor = ''
  let i = start

  const zrzuc = () => {
    if (bufor) wezly.push({ typ: 'html', tresc: bufor })
    bufor = ''
  }

  while (i < src.length) {
    if (src[i] !== '@') {
      bufor += src[i++]
      continue
    }

    const reszta = src.slice(i)
    if (/^@end\b/.test(reszta)) {
      if (!wOczekiwaniuEnd) {
        bufor += src[i++]
        continue
      }
      zrzuc()
      return { wezly, nastepny: i + 4 }
    }

    const m = OTWARCIE.exec(reszta)
    if (!m) {
      bufor += src[i++]
      continue
    }

    const nazwa = m[2]
    if (!DOZWOLONE_KOMPONENTY.has(nazwa)) throw new BladTresci(`nieznany komponent @${nazwa}`)

    const otwarcie = i + m[0].length - 1
    const zamkniecie = koniecNawiasu(src, otwarcie)
    if (zamkniecie === -1) throw new BladTresci(`niedomknięty nawias w @${nazwa}`)

    const propsy = parsujPropsy(src.slice(otwarcie + 1, zamkniecie))
    zrzuc()

    if (m[1] === '!') {
      wezly.push({ typ: 'komponent', nazwa, propsy, dzieci: [] })
      i = zamkniecie + 1
    } else {
      const wynik = parsuj(src, zamkniecie + 1, true)
      wezly.push({ typ: 'komponent', nazwa, propsy, dzieci: wynik.wezly })
      i = wynik.nastepny
    }
  }

  if (wOczekiwaniuEnd) throw new BladTresci('brakuje @end')
  zrzuc()
  return { wezly, nastepny: i }
}

export function parsujTresc(src: string): Wezel[] {
  return parsuj(src, 0, false).wezly
}

function generuj(wezly: Wezel[], stan: Record<string, unknown>, licznik: { n: number }): string {
  let zrodlo = ''
  for (const w of wezly) {
    if (w.typ === 'html') {
      const klucz = `_h${licznik.n++}`
      stan[klucz] = oczyscBlok(w.tresc)
      zrodlo += `{{{ ${klucz} }}}`
      continue
    }

    const klucz = `_p${licznik.n++}`
    stan[klucz] = w.propsy
    if (w.dzieci.length === 0) {
      zrodlo += `\n@!${w.nazwa}(${klucz})\n`
    } else {
      zrodlo += `\n@${w.nazwa}(${klucz})\n${generuj(w.dzieci, stan, licznik)}\n@end\n`
    }
  }
  return zrodlo
}

export function zbudujSzablon(src: string): { zrodlo: string; stan: Record<string, unknown> } {
  const stan: Record<string, unknown> = {}
  const zrodlo = generuj(parsujTresc(src), stan, { n: 0 })
  return { zrodlo, stan }
}
