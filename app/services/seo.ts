import env from '#start/env'
import type { HttpRequest } from '@adonisjs/core/http'

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

export function czyHostLokalny(host: string): boolean {
  const czysty = host
    .replace(/:\d+$/, '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase()
  return (
    czysty === 'localhost' ||
    czysty === '127.0.0.1' ||
    czysty === '::1' ||
    czysty.endsWith('.local') ||
    czysty.endsWith('.test') ||
    czysty.endsWith('.localhost')
  )
}

function hostZAdresu(adres: string): string | null {
  try {
    return new URL(adres).host
  } catch {
    return null
  }
}

export function adresBazowy(request?: HttpRequest): string {
  const zEnv = (env.get('APP_URL') ?? '').replace(/\/+$/, '')
  const hostEnv = zEnv ? hostZAdresu(zEnv) : null
  if (hostEnv && !czyHostLokalny(hostEnv)) return zEnv

  const hostZadania = request?.host()
  if (hostZadania) {
    /* Publiczna domena serwisu chodzi po https (shield wysyła HSTS). */
    const protokol = czyHostLokalny(hostZadania) ? request!.protocol() : 'https'
    return `${protokol}://${hostZadania}`
  }

  return zEnv || 'http://localhost:3333'
}

export function adresBezwzgledny(sciezka: string, request?: HttpRequest): string {
  const baza = adresBazowy(request)
  return baza + (sciezka.startsWith('/') ? sciezka : `/${sciezka}`)
}

export function czyPrywatna(sciezka: string): boolean {
  return PRYWATNE_SCIEZKI.some((p) => sciezka === p || sciezka.startsWith(`${p}/`))
}

export function czyIndeksowac(request?: HttpRequest): boolean {
  const host = hostZAdresu(adresBazowy(request))
  return host !== null && !czyHostLokalny(host)
}

function jsonLd(baza: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': SEO.nazwaStrony,
    'url': baza,
    'description': SEO.opis,
    'inLanguage': SEO.jezyk,
    'publisher': {
      '@type': 'EducationalOrganization',
      'name': 'OKI',
      'url': 'https://oki.org.pl',
      'logo': baza + SEO.obrazek,
    },
  })
}

export function jsonLdScript(baza: string): string {
  const dane = jsonLd(baza).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${dane}</script>`
}
