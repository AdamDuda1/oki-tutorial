import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'

const MAX_WIERSZY = 500
const MAX_DLUGOSC_W_LOGU = 2000

type Wynik = {
  kolumny: string[]
  wiersze: string[][]
  info: string | null
  obciete: boolean
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return `0x${value.toString('hex')}`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function normalizeResult(raw: any): Wynik {
  const payload =
    Array.isArray(raw) && raw.length === 2 && (Array.isArray(raw[1]) || raw[1] === undefined)
      ? raw[0]
      : raw

  if (Array.isArray(payload)) {
    const wszystkie = payload as Record<string, unknown>[]
    const widoczne = wszystkie.slice(0, MAX_WIERSZY)
    const kolumny = widoczne.length > 0 ? Object.keys(widoczne[0]) : []
    return {
      kolumny,
      wiersze: widoczne.map((wiersz) => kolumny.map((k) => formatValue(wiersz[k]))),
      info: `${wszystkie.length} ${wszystkie.length === 1 ? 'wiersz' : 'wierszy'}`,
      obciete: wszystkie.length > widoczne.length,
    }
  }

  const zmienione = payload?.affectedRows ?? payload?.changes
  return {
    kolumny: [],
    wiersze: [],
    info:
      zmienione === undefined
        ? `OK: ${formatValue(payload)}`
        : `OK, zmienionych wierszy: ${zmienione}`,
    obciete: false,
  }
}

export default class AdminSqlController {
  async index({ view }: HttpContext) {
    return view.render('pages/admin/sql', { sql: '', wynik: null, blad: null, czas: null })
  }

  async execute({ request, view, auth }: HttpContext) {
    const sql = String(request.input('sql') ?? '').trim()
    if (!sql) {
      return view.render('pages/admin/sql', {
        sql,
        wynik: null,
        blad: 'Puste zapytanie.',
        czas: null,
      })
    }

    const start = Date.now()
    let wynik: Wynik | null = null
    let blad: string | null = null
    try {
      wynik = normalizeResult(await db.rawQuery(sql))
    } catch (error) {
      blad = error instanceof Error ? error.message : String(error)
    }
    const czas = Date.now() - start

    await AuditLog.record({
      user: auth.user!,
      akcja: 'wykonano',
      typObiektu: 'zapytanie SQL',
      opis: sql.slice(0, MAX_DLUGOSC_W_LOGU),
      zmiany: {
        wynik: { przed: null, po: blad ? `błąd: ${blad}` : (wynik?.info ?? 'OK') },
      },
    })

    return view.render('pages/admin/sql', { sql, wynik, blad, czas })
  }
}
