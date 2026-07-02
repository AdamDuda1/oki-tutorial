import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      if (await db.schema.hasColumn('tematy', 'zadania_rozgrzewkowe')) {
        await db.schema.alterTable('tematy', (table) => {
          table.renameColumn('zadania_rozgrzewkowe', 'zadania_cwiczeniowe')
        })
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      if (await db.schema.hasColumn('tematy', 'zadania_cwiczeniowe')) {
        await db.schema.alterTable('tematy', (table) => {
          table.renameColumn('zadania_cwiczeniowe', 'zadania_rozgrzewkowe')
        })
      }
    })
  }
}
