export type Znak = ' ' | '-' | '+' | '…'
export type LiniaRoznicy = { znak: Znak; klasa: string; tekst: string }

const KLASY: Record<Znak, string> = {
  ' ': 'kontekst',
  '-': 'usuniete',
  '+': 'dodane',
  '…': 'pominiete',
}

const linia = (znak: Znak, tekst: string): LiniaRoznicy => ({ znak, klasa: KLASY[znak], tekst })

export function sformatujWartosc(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'tak' : 'nie'
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

const MAX_LINII = 400
const KONTEKST = 2

function lcs(przed: string[], po: string[]): LiniaRoznicy[] {
  const n = przed.length
  const m = po.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = przed[i] === po[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const linie: LiniaRoznicy[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (przed[i] === po[j]) {
      linie.push(linia(' ', przed[i]))
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      linie.push(linia('-', przed[i++]))
    } else {
      linie.push(linia('+', po[j++]))
    }
  }
  while (i < n) linie.push(linia('-', przed[i++]))
  while (j < m) linie.push(linia('+', po[j++]))
  return linie
}

function zwinKontekst(linie: LiniaRoznicy[]): LiniaRoznicy[] {
  const istotna = linie.map((l) => l.znak !== ' ')
  const zachowaj = linie.map((_, idx) =>
    istotna.slice(Math.max(0, idx - KONTEKST), idx + KONTEKST + 1).some(Boolean)
  )

  const wynik: LiniaRoznicy[] = []
  let pominiete = 0
  for (const [idx, biezaca] of linie.entries()) {
    if (zachowaj[idx]) {
      if (pominiete > 0) {
        wynik.push(linia('…', `${pominiete} niezmienionych linii`))
        pominiete = 0
      }
      wynik.push(biezaca)
    } else {
      pominiete++
    }
  }
  if (pominiete > 0) wynik.push(linia('…', `${pominiete} niezmienionych linii`))
  return wynik
}

export type Roznica =
  | { rodzaj: 'linie'; linie: LiniaRoznicy[] }
  | { rodzaj: 'surowe'; przed: string; po: string }

export function policzRoznice(przed: string, po: string): Roznica {
  const liniePrzed = przed.split('\n')
  const liniePo = po.split('\n')
  if (liniePrzed.length > MAX_LINII || liniePo.length > MAX_LINII) {
    return { rodzaj: 'surowe', przed, po }
  }
  return { rodzaj: 'linie', linie: zwinKontekst(lcs(liniePrzed, liniePo)) }
}
