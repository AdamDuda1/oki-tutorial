import type { HttpContext } from '@adonisjs/core/http'
import Tematy from '#models/tematy'
import Poziomy from '#models/poziomy'
import ListaZadan from '#models/lista_zadan'

export default class SciezkaController {
  async index({ params, view, response }: HttpContext) {
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')

    /* fallback to the first non-deleted level by position, not by id */
    if (!poziomy.some((p) => p.idPoziomu === Number(params.id)) && poziomy.length > 0) {
      return response.redirect().toRoute('sciezka', { id: poziomy[0].idPoziomu })
    }

    const tematy = await Tematy.query()
      .where('published', true)
      .whereNull('deleted_at')
      .where('id_poziomu', params.id)
      .orderBy('position')
      .preload('autor')

    for (const temat of tematy) {
      temat.$extras.materialy = (temat.zewnetrzneMaterialy || []).map((link, i) => ({
        link,
        opis: temat.zewnetrzneMaterialyOpisy?.[i] ?? '',
      }))
    }

    const allTaskIds = tematy.flatMap((t) => [
      ...(t.zadaniaCwiczeniowe ?? []),
      ...(t.zadaniaNaPomysl ?? []),
      ...(t.zadaniaTreningowe ?? []),
    ])
    const taskMap = new Map<number, InstanceType<typeof ListaZadan>>()

    if (allTaskIds.length > 0) {
      const tasks = await ListaZadan.query()
        .whereIn('id_zadania', allTaskIds)
        .where('published', true)
        .whereNull('deleted_at')
        .preload('poziomuTrudnosci')
        .preload('autor')
      for (const task of tasks) {
        taskMap.set(task.idZadania, task)
      }
    }

    for (const temat of tematy) {
      const dodatkoweSet = new Set(temat.zadaniaDodatkowe ?? [])
      temat.$extras.dodatkoweIds = temat.zadaniaDodatkowe ?? []

      const posortuj = (ids: number[] | null) =>
        (ids ?? [])
          .map((id) => taskMap.get(id))
          .filter((z): z is InstanceType<typeof ListaZadan> => Boolean(z))
          .sort((a, b) => {
            const da = dodatkoweSet.has(a.idZadania) ? 1 : 0
            const db = dodatkoweSet.has(b.idZadania) ? 1 : 0
            if (da !== db) return da - db
            const pa = a.poziomuTrudnosci?.position ?? Number.POSITIVE_INFINITY
            const pb = b.poziomuTrudnosci?.position ?? Number.POSITIVE_INFINITY
            return pa - pb
          })

      temat.$extras.zadaniaCwiczeniowe = posortuj(temat.zadaniaCwiczeniowe)
      temat.$extras.zadaniaNaPomysl = posortuj(temat.zadaniaNaPomysl)
      temat.$extras.zadaniaTreningowe = posortuj(temat.zadaniaTreningowe)
    }

    const renderCustom = async (html: string | null | undefined) => {
      if (!html) return null
      try {
        return await view.renderRaw(html)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return `<div class="custom-render-error">custom html rendering error: ${message}</div>`
      }
    }

    for (const temat of tematy)
      if (temat.customHtml) temat.$extras.customHTML = await renderCustom(temat.customHtml)

    const autoOpenId = tematy[0]?.idTematu ?? null // refer to line 11 as the time of writing

    const poziom = poziomy.find((p) => p.idPoziomu === Number(params.id))
    const poziomHtml = await renderCustom(poziom?.customHtml)

    return view.render('pages/sciezka', { params, tematy, poziomy, autoOpenId, poziomHtml })
  }
}
