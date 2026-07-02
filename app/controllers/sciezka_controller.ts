import type { HttpContext } from '@adonisjs/core/http'
import Tematy from '#models/tematy'
import Poziomy from '#models/poziomy'
import ListaZadan from '#models/lista_zadan'

export default class SciezkaController {
  async index({ params, view }: HttpContext) {
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

    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')

    return view.render('pages/sciezka', { params, tematy, poziomy,  })
  }
}
