import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      /**
       * Clean up remnants of an earlier version of this migration
       * (file "create_tagi_table", renamed after it already ran in
       * some environments): a pivot table, an old-shape "tagi" table
       * and a stale adonis_schema entry pointing to the deleted file.
       */
      await db.schema.dropTableIfExists('lista_zadan_tagi')
      await db.schema.dropTableIfExists('tagi')
      await db.from('adonis_schema').where('name', 'like', '%create_tagi_table').delete()

      await db.schema.createTable('tagi', (table) => {
        table.increments('id_tagu')
        table.string('nazwa').notNullable()
      })
    })
  }

  async down() {
    this.schema.dropTable('tagi')
  }
}
