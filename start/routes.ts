import ListaZadan from '#models/lista_zadan'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/index').as('home')
router
  .get('/lista_zadan', async ({ view }) => {
    const zadania = await ListaZadan.all()
    return view.render('pages/lista_zadan', { zadania })
  })
  .as('list')
router.on('/moja_sciezka').render('pages/moja_sciezka').as('my_path')
router.on('/admin').render('pages/admin').as('admin') // TODO CONTROLLER!!!

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
