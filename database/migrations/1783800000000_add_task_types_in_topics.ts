import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tematy', (table) => {
      table.renameColumn('zadania', 'zadania_rozgrzewkowe')
      table.json('zadania_na_pomysl').nullable()
      table.json('zadania_treningowe').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tematy', (table) => {
      table.renameColumn('zadania_rozgrzewkowe', 'zadania')
      table.dropColumn('zadania_na_pomysl')
      table.dropColumn('zadania_treningowe')
    })
  }
}
