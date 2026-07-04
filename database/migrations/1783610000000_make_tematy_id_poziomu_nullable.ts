import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Ujednolica nullability z działającą bazą dev: temat może nie mieć poziomu
 * (sekcja „Bez przypisanego poziomu”), a migracja tworząca tabelę deklarowała
 * NOT NULL — świeża baza z samych migracji zachowywałaby się inaczej niż dev.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tematy', (table) => {
      // bez .references() — rebuild SQLite zachowuje istniejący FK, a ponowna
      // deklaracja dodaje go drugi raz
      table.integer('id_poziomu').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('tematy', (table) => {
      table.integer('id_poziomu').notNullable().alter()
    })
  }
}
