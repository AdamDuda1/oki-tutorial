import type { HttpContext } from '@adonisjs/core/http'
import Obrazek from '#models/obrazek'

export default class ObrazkiController {
  async show({ params, request, response }: HttpContext) {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id < 1) return response.notFound('Nie ma takiego obrazka.')

    const obrazek = await Obrazek.find(id)
    if (!obrazek) return response.notFound('Nie ma takiego obrazka.')

    const etag = `"${obrazek.hash}"`
    if (request.header('if-none-match') === etag) return response.status(304)

    return response
      .header('Content-Type', obrazek.mime)
      .header('Content-Disposition', 'inline')
      .header('ETag', etag)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(obrazek.dane)
  }
}
