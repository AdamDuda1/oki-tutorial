import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('poziomy', (table) => {
      table.boolean('poboczny').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('poziomy', (table) => {
      table.dropColumn('poboczny')
    })
  }
}
