import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('tagi', (table) => {
      table.increments('id_tagu')
      table.string('nazwa').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('tagi')
  }
}
