import ListaZadan from '#models/lista_zadan'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').redirect('sciezka', { id: 0 })

// router.on('/').render('pages/index').as('home')
router.on('/sciezka/:id').render('pages/sciezka').as('sciezka')
router.on('/moja_sciezka').render('pages/moja_sciezka').as('moja_sciezka')
router.on('/admin').render('pages/admin').as('admin') // TODO CONTROLLER!!!

router
  .get('/lista_zadan', async ({ view, request }) => {
    const qs = request.qs()
    const difficulty = qs.difficulty ? Number(qs.difficulty) : null
    const zrodlo = qs.zrodlo || null

    const query = ListaZadan.query().orderBy('id_zadania')
    if (difficulty) query.where('difficulty', difficulty)
    if (zrodlo) query.where('zrodlo', zrodlo)
    const zadania = await query

    const zrodlaRows = await ListaZadan.query()
      .select('zrodlo')
      .distinct('zrodlo')
      .orderBy('zrodlo')
    const zrodla = zrodlaRows.map((r) => r.zrodlo)

    return view.render('pages/lista_zadan', { zadania, zrodla, filters: { difficulty, zrodlo } })
  })
  .as('lista_zadan')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
