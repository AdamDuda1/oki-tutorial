import edge from 'edge.js'
import { execFileSync } from 'node:child_process'
import { DateTime } from 'luxon'

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

edge.global('appVersion', versionInfo.hash)
edge.global('appVersionAge', () => {
  if (!versionInfo.timestamp) return null
  return DateTime.fromSeconds(versionInfo.timestamp).setLocale('pl').toRelative()
})
