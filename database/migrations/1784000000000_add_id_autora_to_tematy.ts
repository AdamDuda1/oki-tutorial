import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('tematy', (table) => {
      table.integer('id_autora').unsigned().references('id').inTable('users').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.table('tematy', (table) => {
      table.dropColumn('id_autora')
    })
  }
}
