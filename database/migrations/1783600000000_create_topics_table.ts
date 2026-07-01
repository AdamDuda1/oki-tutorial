import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tematy'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_tematu')
      table
        .integer('id_poziomu')
        .notNullable()
        .unsigned()
        .references('id_poziomu')
        .inTable('poziomy')
        .onDelete('CASCADE')
      table.integer('position').notNullable()
      table.string('nazwa').notNullable()
      table.text('krotki_opis').nullable()
      table.string('link_yt').nullable()
      table.json('zewnetrzne_materialy').nullable()
      table.json('zewnetrzne_materialy_opisy').nullable()
      table.text('custom_html').nullable()
      table.json('zadania').nullable()
      table.boolean('published').notNullable().defaultTo(false)
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
