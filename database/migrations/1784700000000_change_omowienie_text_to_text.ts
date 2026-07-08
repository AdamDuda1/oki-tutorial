import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('lista_zadan', (table) => {
      table.text('omowienie_text').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('lista_zadan', (table) => {
      table.string('omowienie_text').nullable().alter()
    })
  }
}
