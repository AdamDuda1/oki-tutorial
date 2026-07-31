import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('users', (table) => {
      table.text('szkopul_token').nullable()
      table.string('szkopul_username').nullable()
    })
  }

  async down() {
    this.schema.table('users', (table) => {
      table.dropColumn('szkopul_token')
      table.dropColumn('szkopul_username')
    })
  }
}
