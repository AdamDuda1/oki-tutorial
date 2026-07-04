import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
const SciezkaController = () => import('#controllers/sciezka_controller')
const ListaZadanController = () => import('#controllers/lista_zadan_controller')
const AdminController = () => import('#controllers/admin_controller')
const AdminTasksController = () => import('#controllers/admin_tasks_controller')
const AdminMaterialyController = () => import('#controllers/admin_materialy_controller')

router
  .get('/', async ({ response }) => {
    const { default: Poziomy } = await import('#models/poziomy')
    const pierwszy = await Poziomy.query().whereNull('deleted_at').orderBy('position').first()
    return response.redirect().toRoute('sciezka', { id: pierwszy ? pierwszy.idPoziomu : 1 })
  })
  .as('home')

// router.on('/').render('pages/index').as('home')
router.get('/sciezka/:id', [SciezkaController, 'index']).as('sciezka')
router.get('/lista_zadan', [ListaZadanController, 'index']).as('lista_zadan')

router
  .get('/moja_sciezka', async ({ view }) => view.render('pages/moja_sciezka'))
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
    router.get('/', async ({ view }) => view.render('pages/admin')).as('admin')
    router.get('edit_task', [AdminTasksController, 'index']).as('admin.edit_task.index')
    router.get('edit_task/new', [AdminTasksController, 'create']).as('admin.edit_task.create')
    router.post('edit_task/new', [AdminTasksController, 'store']).as('admin.edit_task.store')
    router.get('edit_task/:id', [AdminTasksController, 'edit']).as('admin.edit_task.edit')
    router.post('edit_task/:id', [AdminTasksController, 'update']).as('admin.edit_task.update')
    router.get('materialy', [AdminMaterialyController, 'index']).as('admin.materialy')
    router
      .get('materialy/temat/new', [AdminMaterialyController, 'create_temat'])
      .as('admin.materialy.create_temat')
    router
      .post('materialy/temat/new', [AdminMaterialyController, 'store_temat'])
      .as('admin.materialy.store_temat')
    router
      .get('materialy/temat/:id', [AdminMaterialyController, 'edit_temat'])
      .as('admin.materialy.edit_temat')
    router
      .post('materialy/temat/:id', [AdminMaterialyController, 'update_temat'])
      .as('admin.materialy.update_temat')
  })
  .prefix('/admin')
  .use(middleware.admin({ roles: ['admin', 'editor1', 'editor2'] }))

router
  .group(() => {
    router
      .get('edit_difficulty_levels', [AdminTasksController, 'create_difficulty_levels'])
      .as('admin.difficulty_levels.create')
    router
      .post('edit_difficulty_levels', [AdminTasksController, 'update_difficulty_levels'])
      .as('admin.difficulty_levels.update')
    router
      .post('edit_difficulty_levels/new', [AdminTasksController, 'store_difficulty_levels'])
      .as('admin.difficulty_levels.store')
    router.get('edit_tags', [AdminTasksController, 'create_tags']).as('admin.tags.create')
    router.post('edit_tags/new', [AdminTasksController, 'store_tags']).as('admin.tags.store')
    router
      .post('edit_tags/:id/delete', [AdminTasksController, 'destroy_tag'])
      .as('admin.tags.destroy')
    router
      .post('materialy/positions', [AdminMaterialyController, 'update_positions'])
      .as('admin.materialy.update_positions')
    router
      .post('materialy/poziom/new', [AdminMaterialyController, 'store_poziom'])
      .as('admin.materialy.store_poziom')
  })
  .prefix('/admin')
  .use(middleware.admin({ roles: ['admin', 'editor2'] }))

router
  .group(() => {
    router.get('users', [AdminController, 'index_users']).as('admin.users')
    router.post('users/:id/role', [AdminController, 'update_role']).as('admin.users.update_role')
    router
      .get('stats_and_audit_log', [AdminController, 'stats_and_audit_log'])
      .as('admin.stats_and_audit_log')
  })
  .prefix('/admin')
  .use(middleware.admin())
