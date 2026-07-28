import { SettingSchema } from '#database/schema'

let cache: Record<string, string | null> | null = null

export default class Setting extends SettingSchema {
  static table = 'settings'
  static selfAssignPrimaryKey = true

  static async getAll(): Promise<Record<string, string | null>> {
    if (cache) return cache
    const wiersze = await Setting.query()
    cache = Object.fromEntries(wiersze.map((s) => [s.key, s.val]))
    return cache
  }

  static async set(key: string, val: string | null) {
    await Setting.updateOrCreate({ key }, { val })
    cache = null
  }
}
