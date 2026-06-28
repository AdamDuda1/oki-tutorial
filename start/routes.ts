import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
const SciezkaController = () => import('#controllers/sciezka_controller')
const ListaZadanController = () => import('#controllers/lista_zadan_controller')
const AdminController = () => import('#controllers/admin_controller')
const AdminTasksController = () => import('#controllers/admin_tasks_controller')

router.on('/').redirect('sciezka', { id: 1 })

// router.on('/').render('pages/index').as('home')
router.get('/sciezka/:id', [SciezkaController, 'index']).as('sciezka')
router.get('/lista_zadan', [ListaZadanController, 'index']).as('lista_zadan')

router.get('/moja_sciezka', async ({ view }) => view.render('pages/moja_sciezka'))
  .as('moja_sciezka')
  .use(middleware.auth())

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

router
  .group(() => {
    router.get('/', [AdminController, 'index']).as('admin')
    router.get('edit_task/new', [AdminTasksController, 'create']).as('admin.edit_task.create')
    router.post('edit_task/new', [AdminTasksController, 'store']).as('admin.edit_task.store')
    router.get('edit_task/:id', [AdminTasksController, 'edit']).as('admin.edit_task.edit')
    router.post('edit_task/:id', [AdminTasksController, 'update']).as('admin.edit_task.update')
  })
  .prefix('/admin')
  .use(middleware.admin())
