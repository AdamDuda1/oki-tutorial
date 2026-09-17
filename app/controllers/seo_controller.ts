import type { HttpContext } from '@adonisjs/core/http'
import { type DateTime } from 'luxon'
import ListaZadan from '#models/lista_zadan'
import Poziomy from '#models/poziomy'
import Tematy from '#models/tematy'
import { adresBezwzgledny, czyIndeksowac } from '#services/seo'

type WpisSitemap = { loc: string; lastmod: string | null; priority: string }

function dzien(data: DateTime | null | undefined): string | null {
  return data ? data.toFormat('yyyy-MM-dd') : null
}

function nowszy(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

export default class SeoController {
  async robots({ request, response }: HttpContext) {
    const linie = ['User-agent: *']

    if (czyIndeksowac(request)) {
      linie.push(
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /konto',
        'Disallow: /moja_sciezka',
        'Disallow: /login',
        'Disallow: /signup',
        'Disallow: /logout',
        'Disallow: /*?*embed=',
        '',
        `Sitemap: ${adresBezwzgledny('/sitemap.xml', request)}`
      )
    } else {
      linie.push('Disallow: /')
    }

    return response
      .header('content-type', 'text/plain; charset=utf-8')
      .header('cache-control', 'public, max-age=3600')
      .send(`${linie.join('\n')}\n`)
  }

  async sitemap({ request, response }: HttpContext) {
    const wpisy: WpisSitemap[] = []

    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')
    const tematy = await Tematy.query()
      .where('published', true)
      .whereNull('deleted_at')
      .select('id_poziomu', 'updated_at')

    const zmianaWPoziomie = new Map<number, string | null>()
    for (const temat of tematy) {
      if (temat.idPoziomu === null) continue
      zmianaWPoziomie.set(
        temat.idPoziomu,
        nowszy(zmianaWPoziomie.get(temat.idPoziomu) ?? null, dzien(temat.updatedAt))
      )
    }

    for (const [i, poziom] of poziomy.entries()) {
      wpisy.push({
        loc: adresBezwzgledny(`/sciezka/${poziom.idPoziomu}`, request),
        lastmod: nowszy(zmianaWPoziomie.get(poziom.idPoziomu) ?? null, dzien(poziom.updatedAt)),
        priority: i === 0 ? '1.0' : '0.8',
      })
    }

    const ostatnieZadanie = await ListaZadan.query()
      .where('published', true)
      .whereNull('deleted_at')
      .orderBy('updated_at', 'desc')
      .first()

    wpisy.push({
      loc: adresBezwzgledny('/lista_zadan', request),
      lastmod: dzien(ostatnieZadanie?.updatedAt),
      priority: '0.7',
    })

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...wpisy.map((w) =>
        [
          '  <url>',
          `    <loc>${w.loc}</loc>`,
          w.lastmod ? `    <lastmod>${w.lastmod}</lastmod>` : null,
          '    <changefreq>weekly</changefreq>',
          `    <priority>${w.priority}</priority>`,
          '  </url>',
        ]
          .filter(Boolean)
          .join('\n')
      ),
      '</urlset>',
      '',
    ].join('\n')

    return response
      .header('content-type', 'application/xml; charset=utf-8')
      .header('cache-control', 'public, max-age=3600')
      .header('x-robots-tag', czyIndeksowac(request) ? 'all' : 'noindex')
      .send(xml)
  }
}
