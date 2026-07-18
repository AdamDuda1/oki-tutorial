import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('settings', (table) => {
      table.string('key').primary()
      table.text('val').nullable()
    })
  }

  async down() {
    this.schema.dropTable('settings')
  }
}
