import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
const SciezkaController = () => import('#controllers/sciezka_controller')
const ListaZadanController = () => import('#controllers/lista_zadan_controller')

router.on('/').redirect('sciezka', { id: 1 })

// router.on('/').redirect('sciezka', { id: 0 })
// router.on('/').render('pages/index').as('home')
router.get('/sciezka/:id', [SciezkaController, 'index']).as('sciezka')
router.on('/moja_sciezka').render('pages/moja_sciezka').as('moja_sciezka')
router.on('/admin').render('pages/admin').as('admin')

router.get('/lista_zadan', [ListaZadanController, 'index']).as('lista_zadan')

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
