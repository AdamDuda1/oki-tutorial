import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        "UPDATE `lista_zadan` SET `created_at` = COALESCE(`updated_at`, CURRENT_TIMESTAMP) WHERE CAST(`created_at` AS CHAR) LIKE '0000-00-00%'"
      )
    })

    this.schema.raw(
      'ALTER TABLE `lista_zadan` MODIFY `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
    )

    this.schema.table('lista_zadan', (table) => {
      table.string('szkopul_contest', 64).nullable()
      table.integer('szkopul_pi_id').unsigned().nullable()
      table.string('szkopul_short_name', 64).nullable()

      table.index(['szkopul_contest', 'szkopul_pi_id'])
    })
  }

  async down() {
    this.schema.table('lista_zadan', (table) => {
      table.dropIndex(['szkopul_contest', 'szkopul_pi_id'])
      table.dropColumn('szkopul_contest')
      table.dropColumn('szkopul_pi_id')
      table.dropColumn('szkopul_short_name')
    })
  }
}
