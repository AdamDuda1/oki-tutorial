import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('poziomy_trudnosci', (table) => {
      table.increments('id_poziomu_trudnosci')
      table.string('skrot').notNullable()
      table.string('rozwiniecie').notNullable()
      table.integer('position').unsigned().notNullable()
      table.string('color').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.table('lista_zadan', (table) => {
      table
        .integer('id_poziomu_trudnosci')
        .unsigned()
        .nullable()
        .references('id_poziomu_trudnosci')
        .inTable('poziomy_trudnosci')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.table('lista_zadan', (table) => {
      table.dropColumn('id_poziomu_trudnosci')
    })
    this.schema.dropTable('poziomy_trudnosci')
  }
}
