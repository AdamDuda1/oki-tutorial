import type { HttpContext } from '@adonisjs/core/http'
import Tematy from '#models/tematy'
import Poziomy from '#models/poziomy'
import ListaZadan from '#models/lista_zadan'
import { pobierzWyniki, policzPostep } from '#services/szkopul_wyniki'
import { pobierzToken } from '#services/szkopul_polaczenie'

export default class SciezkaController {
  async index(ctx: HttpContext) {
    const { params, view, response } = ctx
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')

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

    const wynikiMapa = await pobierzWyniki(ctx)
    const pokazPostep = Boolean(pobierzToken(ctx))
    const sledzoneWPoziomie = new Map<number, InstanceType<typeof ListaZadan>>()

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

      const wszystkieTematu = [
        ...temat.$extras.zadaniaCwiczeniowe,
        ...temat.$extras.zadaniaNaPomysl,
        ...temat.$extras.zadaniaTreningowe,
      ] as InstanceType<typeof ListaZadan>[]

      temat.$extras.postep = pokazPostep
        ? policzPostep(wszystkieTematu, wynikiMapa, dodatkoweSet)
        : null

      for (const z of wszystkieTematu) {
        if (!dodatkoweSet.has(z.idZadania)) sledzoneWPoziomie.set(z.idZadania, z)
      }
    }

    const postepPoziomu = pokazPostep
      ? policzPostep([...sledzoneWPoziomie.values()], wynikiMapa)
      : null

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

    const wyniki = Object.fromEntries(wynikiMapa)

    return view.render('pages/sciezka', {
      params,
      tematy,
      poziomy,
      autoOpenId,
      poziomHtml,
      wyniki,
      postepPoziomu,
    })
  }
}
