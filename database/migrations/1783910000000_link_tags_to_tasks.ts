import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      if (!(await db.schema.hasColumn('lista_zadan', 'tagi'))) {
        await db.schema.alterTable('lista_zadan', (table) => {
          table.json('tagi').nullable()
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      if (await db.schema.hasColumn('lista_zadan', 'tagi')) {
        await db.schema.alterTable('lista_zadan', (table) => {
          table.dropColumn('tagi')
        })
      }
    })
  }
}
