import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import Obrazek from '#models/obrazek'
import AuditLog from '#models/audit_log'

const MAKS_ROZMIAR = '4mb'

const ROZSZERZENIA = ['png', 'jpg', 'jpeg', 'webp', 'gif'] // te allowed

function wykryjMime(buf: Buffer): string | null {
  if (buf.length < 12) return null
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif'
  if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export default class AdminObrazkiController {
  async index({ view }: HttpContext) {
    const obrazki = await Obrazek.query()
      .select(Obrazek.kolumnyBezDanych)
      .orderBy('id', 'desc')
      .limit(200)
    return view.render('pages/admin/obrazki', { obrazki })
  }

  async store({ request, response, session, auth }: HttpContext) {
    const odrzuc = (powod: string) => {
      session.flash('error', powod)
      return response.redirect().back()
    }

    const plik = request.file('obrazek', { extnames: ROZSZERZENIA, size: MAKS_ROZMIAR })
    if (!plik) return odrzuc('Nie wybrano pliku.')
    if (!plik.isValid) return odrzuc(plik.errors.map((e) => e.message).join(' '))

    const dane = await readFile(plik.tmpPath!)
    const mime = wykryjMime(dane)
    if (!mime) return odrzuc('Tego formatu nie ma na liście dozwolonych. Można to zmienić w źródle w admin_obrazki_controller.ts. Możliwe, że to rozszerzenie jest w stanie wykonywać skrypty (np. SVG), dlatego zostało wykluczone.')

    const hash = createHash('sha256').update(dane).digest('hex')
    const istniejacy = await Obrazek.query()
      .select(Obrazek.kolumnyBezDanych)
      .where('hash', hash)
      .first()
    if (istniejacy) {
      session.flash(
        'success',
        `Ten plik już był wgrany jako #${istniejacy.id} - gotowy fragment jest na liście poniżej.`
      )
      return response.redirect().back()
    }

    const obrazek = await Obrazek.create({
      nazwa: plik.clientName.replace(/[^\w.\- ]+/g, '_').slice(0, 120),
      mime,
      hash,
      rozmiar: dane.length,
      dane,
      idAutora: auth.user!.id,
    })
    await AuditLog.record({
      user: auth.user!,
      akcja: 'utworzono',
      typObiektu: 'obrazek',
      idObiektu: obrazek.id,
      opis: `wgrano obrazek ${obrazek.nazwa} (${Math.round(dane.length / 1024)} kB)`,
    })

    session.flash('success', `Wgrano „${obrazek.nazwa}” jako #${obrazek.id}.`)
    return response.redirect().back()
  }

  async destroy({ params, response, session, auth }: HttpContext) {
    const obrazek = await Obrazek.query()
      .select(Obrazek.kolumnyBezDanych)
      .where('id', Number(params.id))
      .firstOrFail()
    const { id, nazwa } = obrazek
    await obrazek.delete()
    await AuditLog.record({
      user: auth.user!,
      akcja: 'usunięto',
      typObiektu: 'obrazek',
      idObiektu: id,
      opis: `usunięto obrazek ${nazwa}`,
    })
    session.flash('success', `Usunięto obrazek ${nazwa}.`)
    return response.redirect().back()
  }
}
