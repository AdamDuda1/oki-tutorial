import { SettingSchema } from '#database/schema'

let cache: Record<string, string | null> | null = null

export default class Setting extends SettingSchema {
  static table = 'settings'
  static selfAssignPrimaryKey = true

  static async getAll(): Promise<Record<string, string | null>> {
    const c = cache ?? Object.fromEntries((await Setting.query()).map((s) => [s.key, s.val]))
    cache = c
    return c
  }

  static async set(key: string, val: string | null) {
    await Setting.updateOrCreate({ key }, { val })
    cache = null
  }
}
