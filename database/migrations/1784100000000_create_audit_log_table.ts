import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('audit_log', (table) => {
      table.increments('id')
      table.integer('id_uzytkownika').nullable()
      table.string('uzytkownik').notNullable()
      table.string('akcja').notNullable()
      table.string('typ_obiektu').notNullable()
      table.integer('id_obiektu').nullable()
      table.string('opis').notNullable()
      table.json('zmiany').nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('audit_log')
  }
}
