import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('users', (table) => {
      table.timestamp('last_login_at').nullable()
    })
  }

  async down() {
    this.schema.table('users', (table) => {
      table.dropColumn('last_login_at')
    })
  }
}
