import env from '#start/env'

/* domyślne metadane strony */
export const SEO = {
  nazwaStrony: 'Kurs OKI',
  jezyk: 'pl',
  locale: 'pl_PL',
  kolorMotywu: '#cf22ff',
  obrazek: '/logo_square.png',
  opis: 'Darmowa ścieżka nauki algorytmiki i programowania w C++: materiały, omówienia wideo i zadania do samodzielnego rozwiązania, od podstaw aż po Olimpiadę Informatyczną.',
}

const PRYWATNE_SCIEZKI = ['/admin', '/konto', '/moja_sciezka', '/login', '/signup', '/logout']

export function adresBazowy(): string {
  return env.get('APP_URL').replace(/\/+$/, '')
}

export function adresBezwzgledny(sciezka: string): string {
  return adresBazowy() + (sciezka.startsWith('/') ? sciezka : `/${sciezka}`)
}

export function czyPrywatna(sciezka: string): boolean {
  return PRYWATNE_SCIEZKI.some((p) => sciezka === p || sciezka.startsWith(`${p}/`))
}

export function czyIndeksowac(adres: string = adresBazowy()): boolean {
  if (env.get('NODE_ENV') === 'test' && adres === adresBazowy()) return false
  try {
    const host = new URL(adres).hostname
    return !(
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.test') ||
      host.endsWith('.localhost')
    )
  } catch {
    return false
  }
}

function jsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': SEO.nazwaStrony,
    'url': adresBazowy(),
    'description': SEO.opis,
    'inLanguage': SEO.jezyk,
    'publisher': {
      '@type': 'EducationalOrganization',
      'name': 'OKI',
      'url': 'https://oki.org.pl',
      'logo': adresBezwzgledny(SEO.obrazek),
    },
  })
}

export function jsonLdScript(): string {
  const dane = jsonLd().replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${dane}</script>`
}
