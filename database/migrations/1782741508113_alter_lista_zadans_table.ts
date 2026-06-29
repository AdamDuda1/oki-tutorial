import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lista_zadan'

  async up() {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('difficulty')
    })
  }

  async down() {
    this.schema.table(this.tableName, (table) => {
      table.integer('difficulty').unsigned().nullable()
    })
  }
}