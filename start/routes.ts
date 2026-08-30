import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
const SciezkaController = () => import('#controllers/sciezka_controller')
const ListaZadanController = () => import('#controllers/lista_zadan_controller')
const AdminController = () => import('#controllers/admin_controller')
const AdminTasksController = () => import('#controllers/admin_tasks_controller')
const AdminMaterialyController = () => import('#controllers/admin_materialy_controller')
const AdminSqlController = () => import('#controllers/admin_sql_controller')
const AdminSzkopulController = () => import('#controllers/admin_szkopul_controller')
const ObrazkiController = () => import('#controllers/obrazki_controller')
const AdminObrazkiController = () => import('#controllers/admin_obrazki_controller')
const KontoController = () => import('#controllers/konto_controller')
const SzkopulController = () => import('#controllers/szkopul_controller')

router.get('/', [SciezkaController, 'home']).as('home')

// router.on('/').render('pages/index').as('home')
router.get('/sciezka/:id', [SciezkaController, 'index']).as('sciezka')
router.get('/lista_zadan', [ListaZadanController, 'index']).as('lista_zadan')
router.get('/obrazki/:id', [ObrazkiController, 'show']).as('obrazki.show')

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
  .post('/szkopul/odswiez', [SzkopulController, 'odswiez'])
  .as('szkopul.odswiez')
  .use(middleware.szkopul())

router.get('/konto', [KontoController, 'index']).as('konto')
router
  .group(() => {
    router.post('/konto/szkopul', [KontoController, 'polaczSzkopul']).as('konto.szkopul.polacz')
    router
      .post('/konto/szkopul/rozlacz', [KontoController, 'rozlaczSzkopul'])
      .as('konto.szkopul.rozlacz')
  })
  .use(middleware.szkopul())

router
  .group(() => {
    router.post('/konto/dane', [KontoController, 'zapiszDane']).as('konto.dane')
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', async ({ view }) => view.render('pages/admin')).as('admin')
    router.get('edit_task', [AdminTasksController, 'index']).as('admin.edit_task.index')
    router.get('edit_task/new', [AdminTasksController, 'create']).as('admin.edit_task.create')
    router.post('edit_task/new', [AdminTasksController, 'store']).as('admin.edit_task.store')
    router
      .get('edit_task/import', [AdminTasksController, 'import_csv_form'])
      .as('admin.edit_task.import')
    router
      .get('edit_task/import/template', [AdminTasksController, 'import_csv_template'])
      .as('admin.edit_task.import_template')
    router
      .post('edit_task/import', [AdminTasksController, 'import_csv'])
      .as('admin.edit_task.import_store')
    router.get('edit_task/:id', [AdminTasksController, 'edit']).as('admin.edit_task.edit')
    router.post('edit_task/:id', [AdminTasksController, 'update']).as('admin.edit_task.update')
    router
      .post('edit_task/:id/delete', [AdminTasksController, 'destroy'])
      .as('admin.edit_task.destroy')
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
    router.get('obrazki', [AdminObrazkiController, 'index']).as('admin.obrazki.index')
    router.post('obrazki', [AdminObrazkiController, 'store']).as('admin.obrazki.store')
    router
      .post('obrazki/:id/delete', [AdminObrazkiController, 'destroy'])
      .as('admin.obrazki.destroy')
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
    router
      .post('edit_task/:id/toggle_published', [AdminTasksController, 'toggle_published'])
      .as('admin.edit_task.toggle_published')
    router
      .post('materialy/positions', [AdminMaterialyController, 'update_positions'])
      .as('admin.materialy.update_positions')
    router
      .post('materialy/poziom/new', [AdminMaterialyController, 'store_poziom'])
      .as('admin.materialy.store_poziom')
    router
      .get('materialy/poziom/:id', [AdminMaterialyController, 'edit_poziom'])
      .as('admin.materialy.edit_poziom')
    router
      .post('materialy/poziom/:id', [AdminMaterialyController, 'update_poziom'])
      .as('admin.materialy.update_poziom')
    router
      .post('materialy/poziom/:id/delete', [AdminMaterialyController, 'destroy_poziom'])
      .as('admin.materialy.destroy_poziom')
  })
  .prefix('/admin')
  .use(middleware.admin({ roles: ['admin', 'editor2'] }))

router
  .group(() => {
    router.get('edit_tags', [AdminTasksController, 'create_tags']).as('admin.tags.create')
    router.post('edit_tags/new', [AdminTasksController, 'store_tags']).as('admin.tags.store')
    router.post('edit_tags/:id', [AdminTasksController, 'update_tag']).as('admin.tags.update')
    router
      .post('edit_tags/:id/delete', [AdminTasksController, 'destroy_tag'])
      .as('admin.tags.destroy')
    router.get('users', [AdminController, 'index_users']).as('admin.users')
    router.post('users/:id/role', [AdminController, 'update_role']).as('admin.users.update_role')
    router
      .post('users/:id/reset_password', [AdminController, 'reset_password'])
      .as('admin.users.reset_password')
    router.post('users/:id/delete', [AdminController, 'destroy_user']).as('admin.users.destroy')
    router
      .get('stats_and_audit_log', [AdminController, 'stats_and_audit_log'])
      .as('admin.stats_and_audit_log')
    router
      .post('stats_and_audit_log/:id/revert', [AdminController, 'revert_audit_entry'])
      .as('admin.stats_and_audit_log.revert')
    router.get('sql', [AdminSqlController, 'index']).as('admin.sql')
    router.post('sql', [AdminSqlController, 'execute']).as('admin.sql.execute')

    router.get('szkopul', [AdminSzkopulController, 'index']).as('admin.szkopul')
    router.post('szkopul', [AdminSzkopulController, 'store']).as('admin.szkopul.store')
    router.get('site_settings', [AdminController, 'site_settings']).as('admin.site_settings')
    router
      .post('site_settings', [AdminController, 'update_site_settings'])
      .as('admin.site_settings.update')
  })
  .prefix('/admin')
  .use(middleware.admin())
