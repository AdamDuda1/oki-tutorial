import edge from 'edge.js'
import { execFileSync } from 'node:child_process'
import { DateTime } from 'luxon'
import env from '#start/env'
import { SZKOPUL_WLACZONY } from '#services/szkopul'

function resolveVersionInfo(): { hash: string; timestamp: number | null } {
  if (process.env.APP_VERSION) {
    return { hash: process.env.APP_VERSION, timestamp: null }
  }

  try {
    const output = execFileSync('git', ['log', '-1', '--format=%h|%ct'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    const [hash, timestamp] = output.split('|')
    return { hash, timestamp: Number(timestamp) || null }
  } catch {
    return { hash: 'unknown', timestamp: null }
  }
}

const versionInfo = resolveVersionInfo()

edge.global('siteSettings', async () => {
  const { default: Setting } = await import('#models/setting')
  return Setting.getAll()
})

const umamiUrl = (env.get('UMAMI_URL') ?? '').replace(/\/+$/, '')
const umamiWebsiteId = env.get('UMAMI_WEBSITE_ID') ?? ''

edge.global('umami', {
  url: umamiUrl,
  websiteId: umamiWebsiteId,
  enabled: Boolean(umamiUrl && umamiWebsiteId),
})

edge.global('szkopul', { enabled: SZKOPUL_WLACZONY })

edge.global('odznakaWyniku', async (wynik: unknown) => {
  const { odznakaWyniku } = await import('#services/szkopul_wyniki')
  return odznakaWyniku(wynik as any)
})

edge.global('appVersion', versionInfo.hash)
edge.global('appVersionAge', () => {
  if (!versionInfo.timestamp) return null
  return DateTime.fromSeconds(versionInfo.timestamp).setLocale('pl').toRelative()
})
