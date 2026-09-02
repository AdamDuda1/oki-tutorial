import type { HttpContext } from '@adonisjs/core/http'
import router from '@adonisjs/core/services/router'
import Tematy from '#models/tematy'
import Poziomy from '#models/poziomy'
import ListaZadan from '#models/lista_zadan'
import { pobierzWyniki, policzPostep } from '#services/szkopul_wyniki'
import { pobierzToken } from '#services/szkopul_polaczenie'

const OSTATNIA_SCIEZKA_KEY = 'ostatnia_sciezka'

export default class SciezkaController {
  async home({ request, response }: HttpContext) {
    const poziomy = await Poziomy.query().whereNull('deleted_at').orderBy('position')
    if (poziomy.length === 0) return response.redirect().toRoute('sciezka', { id: 1 })

    const zapamietane = String(request.plainCookie(OSTATNIA_SCIEZKA_KEY, { encoded: false }) ?? '')
    const [idPoziomu, idTematu] = zapamietane.split('.').map(Number)
    const poziom = poziomy.find((p) => p.idPoziomu === idPoziomu) ?? poziomy[0]

    const temat =
      poziom.idPoziomu === idPoziomu && Number.isInteger(idTematu)
        ? await Tematy.query()
            .where('id_tematu', idTematu)
            .where('id_poziomu', poziom.idPoziomu)
            .where('published', true)
            .whereNull('deleted_at')
            .first()
        : null

    return response.redirect(
      router.makeUrl(
        'sciezka',
        { id: poziom.idPoziomu },
        temat ? { qs: { temat: temat.idTematu } } : {}
      )
    )
  }

  async index(ctx: HttpContext) {
    const { params, view, response, request } = ctx
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
    const zadaniaWPoziomie = new Map<number, InstanceType<typeof ListaZadan>>()
    const podstawoweWPoziomie = new Set<number>()

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
        zadaniaWPoziomie.set(z.idZadania, z)
        if (!dodatkoweSet.has(z.idZadania)) podstawoweWPoziomie.add(z.idZadania)
      }
    }

    const dodatkoweWPoziomie = new Set(
      [...zadaniaWPoziomie.keys()].filter((id) => !podstawoweWPoziomie.has(id))
    )

    const postepPoziomu = pokazPostep
      ? policzPostep([...zadaniaWPoziomie.values()], wynikiMapa, dodatkoweWPoziomie)
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

    const zapamietany = Number(request.qs().temat)
    const autoOpenId =
      tematy.find((t) => t.idTematu === zapamietany)?.idTematu ?? tematy[0]?.idTematu ?? null // refer to line 11 as the time of writing

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
