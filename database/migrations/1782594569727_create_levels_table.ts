import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'poziomy'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id_poziomu')
      table.integer('position').notNullable()
      table.string('nazwa').notNullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
