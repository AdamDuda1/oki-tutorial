import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('poziomy', (table) => {
      table.text('custom_html').nullable()
    })
  }

  async down() {
    this.schema.alterTable('poziomy', (table) => {
      table.dropColumn('custom_html')
    })
  }
}
