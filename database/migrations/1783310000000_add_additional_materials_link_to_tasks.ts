import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('lista_zadan', (table) => {
      table.string('link_dodatkowe_materialy').nullable()
    })
  }

  async down() {
    this.schema.alterTable('lista_zadan', (table) => {
      table.dropColumn('link_dodatkowe_materialy')
    })
  }
}
