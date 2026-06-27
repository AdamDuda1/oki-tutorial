import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'sciezka': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'moja_sciezka': { paramsTuple?: []; params?: {} }
    'admin': { paramsTuple?: []; params?: {} }
    'lista_zadan': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'sciezka': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'moja_sciezka': { paramsTuple?: []; params?: {} }
    'admin': { paramsTuple?: []; params?: {} }
    'lista_zadan': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'sciezka': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'moja_sciezka': { paramsTuple?: []; params?: {} }
    'admin': { paramsTuple?: []; params?: {} }
    'lista_zadan': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}