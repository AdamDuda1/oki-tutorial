import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('lista_zadan', (table) => {
      table.renameColumn('link_omowienie_text', 'omowienie_text')
    })
  }

  async down() {
    this.schema.alterTable('lista_zadan', (table) => {
      table.renameColumn('omowienie_text', 'link_omowienie_text')
    })
  }
}
