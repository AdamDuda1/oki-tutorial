import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('poziomy', (table) => {
      table.increments('id_poziomu')
      table.integer('position').notNullable()
      table.string('nazwa').notNullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('poziomy')
  }
}
