import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('lista_zadan', (table) => {
      table.json('tagi').nullable()
    })
  }

  async down() {
    this.schema.table('lista_zadan', (table) => {
      table.dropColumn('tagi')
    })
  }
}
