import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.table('users', (table) => {
      table.timestamp('szkopul_wyniki_odswiezone_at').nullable()
    })
  }

  async down() {
    this.schema.table('users', (table) => {
      table.dropColumn('szkopul_wyniki_odswiezone_at')
    })
  }
}
