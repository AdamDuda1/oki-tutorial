import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('obrazki', (table) => {
      table.increments('id')
      table.string('nazwa').notNullable()
      table.string('mime', 100).notNullable()
      table.string('hash', 64).notNullable().unique()
      table.integer('rozmiar').unsigned().notNullable()
      table.specificType('dane', 'mediumblob').notNullable()
      table.integer('id_autora').unsigned().nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable('obrazki')
  }
}
