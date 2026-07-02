import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tematy', (table) => {
      table.renameColumn('zadania_rozgrzewkowe', 'zadania_cwiczeniowe')
      table.json('zadania_na_pomysl').nullable()
      table.json('zadania_treningowe').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tematy', (table) => {
      table.renameColumn('zadania_cwiczeniowe', 'zadania_rozgrzewkowe')
    })
  }
}
