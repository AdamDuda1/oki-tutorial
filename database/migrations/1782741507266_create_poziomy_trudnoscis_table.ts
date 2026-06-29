import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('poziomy_trudnosci', (table) => {
      table.increments('id_poziomu_trudnosci')
      table.string('skrot').notNullable()
      table.string('rozwiniecie').notNullable()
      table.integer('position').unsigned().notNullable()
      table.string('color').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.table('lista_zadan', (table) => {
      table
        .integer('id_poziomu_trudnosci')
        .unsigned()
        .nullable()
        .references('id_poziomu_trudnosci')
        .inTable('poziomy_trudnosci')
        .onDelete('SET NULL')
    })

    this.defer(async (db) => {
      await db.table('poziomy_trudnosci').insert([
        { skrot: 'Ł', rozwiniecie: 'Łatwe', position: 1, created_at: new Date().toISOString().replace('T', ' ').slice(0, 23) },
        { skrot: 'Ś', rozwiniecie: 'Średnie', position: 2, created_at: new Date().toISOString().replace('T', ' ').slice(0, 23) },
        { skrot: 'T', rozwiniecie: 'Trudne', position: 3, created_at: new Date().toISOString().replace('T', ' ').slice(0, 23) },
        { skrot: 'BT', rozwiniecie: 'Bardzo trudne', position: 4, created_at: new Date().toISOString().replace('T', ' ').slice(0, 23) },
      ])

      for (const d of [1, 2, 3, 4]) {
        await db.from('lista_zadan').where('difficulty', d).update({ id_poziomu_trudnosci: d })
      }
    })
  }

  async down() {
    this.schema.table('lista_zadan', (table) => {
      table.dropColumn('id_poziomu_trudnosci')
    })
    this.schema.dropTable('poziomy_trudnosci')
  }
}