import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('audit_log', (table) => {
      table.text('opis').notNullable().alter()
    })

    this.defer(async (db) => {
      await db.from('audit_log').where('zmiany', 'null').update({ zmiany: null })
    })
  }

  async down() {
    this.schema.alterTable('audit_log', (table) => {
      table.string('opis').notNullable().alter()
    })
  }
}
