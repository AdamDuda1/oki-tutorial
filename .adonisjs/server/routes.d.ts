import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'sciezka': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lista_zadan': { paramsTuple?: []; params?: {} }
    'moja_sciezka': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'admin': { paramsTuple?: []; params?: {} }
    'admin.edit_task.index': { paramsTuple?: []; params?: {} }
    'admin.edit_task.create': { paramsTuple?: []; params?: {} }
    'admin.edit_task.store': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import_template': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import_store': { paramsTuple?: []; params?: {} }
    'admin.edit_task.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.edit_task.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.edit_task.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy': { paramsTuple?: []; params?: {} }
    'admin.materialy.create_temat': { paramsTuple?: []; params?: {} }
    'admin.materialy.store_temat': { paramsTuple?: []; params?: {} }
    'admin.materialy.edit_temat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.update_temat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.difficulty_levels.create': { paramsTuple?: []; params?: {} }
    'admin.difficulty_levels.update': { paramsTuple?: []; params?: {} }
    'admin.difficulty_levels.store': { paramsTuple?: []; params?: {} }
    'admin.edit_task.toggle_published': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.tags.create': { paramsTuple?: []; params?: {} }
    'admin.tags.store': { paramsTuple?: []; params?: {} }
    'admin.tags.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.update_positions': { paramsTuple?: []; params?: {} }
    'admin.materialy.store_poziom': { paramsTuple?: []; params?: {} }
    'admin.materialy.edit_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.update_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.destroy_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.users.update_role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.stats_and_audit_log': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'sciezka': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lista_zadan': { paramsTuple?: []; params?: {} }
    'moja_sciezka': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'admin': { paramsTuple?: []; params?: {} }
    'admin.edit_task.index': { paramsTuple?: []; params?: {} }
    'admin.edit_task.create': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import_template': { paramsTuple?: []; params?: {} }
    'admin.edit_task.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy': { paramsTuple?: []; params?: {} }
    'admin.materialy.create_temat': { paramsTuple?: []; params?: {} }
    'admin.materialy.edit_temat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.difficulty_levels.create': { paramsTuple?: []; params?: {} }
    'admin.tags.create': { paramsTuple?: []; params?: {} }
    'admin.materialy.edit_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.stats_and_audit_log': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'sciezka': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'lista_zadan': { paramsTuple?: []; params?: {} }
    'moja_sciezka': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'admin': { paramsTuple?: []; params?: {} }
    'admin.edit_task.index': { paramsTuple?: []; params?: {} }
    'admin.edit_task.create': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import_template': { paramsTuple?: []; params?: {} }
    'admin.edit_task.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy': { paramsTuple?: []; params?: {} }
    'admin.materialy.create_temat': { paramsTuple?: []; params?: {} }
    'admin.materialy.edit_temat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.difficulty_levels.create': { paramsTuple?: []; params?: {} }
    'admin.tags.create': { paramsTuple?: []; params?: {} }
    'admin.materialy.edit_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users': { paramsTuple?: []; params?: {} }
    'admin.stats_and_audit_log': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'admin.edit_task.store': { paramsTuple?: []; params?: {} }
    'admin.edit_task.import_store': { paramsTuple?: []; params?: {} }
    'admin.edit_task.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.edit_task.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.store_temat': { paramsTuple?: []; params?: {} }
    'admin.materialy.update_temat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.difficulty_levels.update': { paramsTuple?: []; params?: {} }
    'admin.difficulty_levels.store': { paramsTuple?: []; params?: {} }
    'admin.edit_task.toggle_published': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.tags.store': { paramsTuple?: []; params?: {} }
    'admin.tags.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.update_positions': { paramsTuple?: []; params?: {} }
    'admin.materialy.store_poziom': { paramsTuple?: []; params?: {} }
    'admin.materialy.update_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.materialy.destroy_poziom': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.update_role': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}