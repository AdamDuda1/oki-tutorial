import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('wyniki_szkopul', (table) => {
      table.increments('id')
      table
        .integer('id_uzytkownika')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('id_zadania').unsigned().notNullable()
      table.integer('score').nullable()
      table.string('status').nullable()
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())

      table.unique(['id_uzytkownika', 'id_zadania'])
      table.index('id_zadania')
    })
  }

  async down() {
    this.schema.dropTable('wyniki_szkopul')
  }
}
