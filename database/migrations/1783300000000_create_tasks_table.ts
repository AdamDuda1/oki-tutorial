import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('lista_zadan', (table) => {
      table.increments('id_zadania')
      table.integer('id_autora').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.string('nazwa').notNullable()
      table.string('zrodlo').notNullable()
      table.string('link_zrodlo').nullable()
      table.string('link_tresc').notNullable()
      table.string('link_wyslij').nullable()
      table.string('link_omowienie_vid').nullable()
      table.string('link_omowienie_text').nullable()
      table.text('hint').nullable()
      table.text('kod_cpp').nullable()
      table.text('kod_python').nullable()
      table.integer('difficulty').unsigned().defaultTo(1)
      table.boolean('published').notNullable().defaultTo(true)
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('lista_zadan')
  }
}
