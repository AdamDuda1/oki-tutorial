import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('users', (table) => {
      table.string('role').notNullable().defaultTo('user')
    })
  }

  async down() {
    this.schema.table('users', (table) => {
      table.dropColumn('role')
    })
  }
}
