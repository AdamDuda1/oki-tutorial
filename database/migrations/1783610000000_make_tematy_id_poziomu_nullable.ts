import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tematy', (table) => {
      table.integer('id_poziomu').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('tematy', (table) => {
      table.integer('id_poziomu').notNullable().alter()
    })
  }
}
