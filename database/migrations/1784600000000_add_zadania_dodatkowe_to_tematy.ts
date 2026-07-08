import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tematy', (table) => {
      table.json('zadania_dodatkowe').nullable()
    })
  }

  async down() {
    this.schema.alterTable('tematy', (table) => {
      table.dropColumn('zadania_dodatkowe')
    })
  }
}
