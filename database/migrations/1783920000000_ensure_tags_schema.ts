import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Repair migration: some environments have the earlier tags migrations
 * recorded in "adonis_schema" as completed even though the actual tables
 * or columns are missing (the tags design changed mid-way and files were
 * renamed/deleted after they had already run). This migration is new
 * everywhere, so it always runs, and it converges any state to the final
 * shape without touching data that is already correct.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.schema.dropTableIfExists('lista_zadan_tagi')

      if ((await db.schema.hasTable('tagi')) && (await db.schema.hasColumn('tagi', 'created_at'))) {
        await db.schema.dropTable('tagi')
      }

      if (!(await db.schema.hasTable('tagi'))) {
        await db.schema.createTable('tagi', (table) => {
          table.increments('id_tagu')
          table.string('nazwa').notNullable()
        })
      }

      if (!(await db.schema.hasColumn('lista_zadan', 'tagi'))) {
        await db.schema.alterTable('lista_zadan', (table) => {
          table.json('tagi').nullable()
        })
      }

      if (await db.schema.hasColumn('tematy', 'zadania_rozgrzewkowe')) {
        await db.schema.alterTable('tematy', (table) => {
          table.renameColumn('zadania_rozgrzewkowe', 'zadania_cwiczeniowe')
        })
      }

      await db.from('adonis_schema').where('name', 'like', '%create_tagi_table').delete()
    })
  }

  async down() {}
}
