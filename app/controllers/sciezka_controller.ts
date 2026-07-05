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
      for (const task of tasks) {
        taskMap.set(task.idZadania, task)
      }
    }

    for (const temat of tematy)
      temat.$extras.zadaniaCwiczeniowe = (temat.zadaniaCwiczeniowe ?? [])
        .map((id) => taskMap.get(id))
        .filter(Boolean)

    for (const temat of tematy)
      temat.$extras.zadaniaNaPomysl = (temat.zadaniaNaPomysl ?? [])
        .map((id) => taskMap.get(id))
        .filter(Boolean)

    for (const temat of tematy)
      temat.$extras.zadaniaTreningowe = (temat.zadaniaTreningowe ?? [])
        .map((id) => taskMap.get(id))
        .filter(Boolean)

    for (const temat of tematy)
      if (temat.customHtml) temat.$extras.customHTML = await view.renderRaw(temat.customHtml)

    const autoOpenId = tematy[0]?.idTematu ?? null // refer to line 11 as the time of writing

    const poziom = poziomy.find((p) => p.idPoziomu === Number(params.id))
    const poziomHtml = poziom?.customHtml ? await view.renderRaw(poziom.customHtml) : null

    return view.render('pages/sciezka', { params, tematy, poziomy, autoOpenId, poziomHtml })
  }
}
