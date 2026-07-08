export function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  const candidates: Array<',' | ';' | '\t'> = [',', ';', '\t']
  let best: ',' | ';' | '\t' = ','
  let bestCount = -1
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1
    if (count > bestCount) {
      bestCount = count
      best = d
    }
  }
  return best
}

export function parseCsv(input: string, delimiter: string = ','): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      i++
    } else if (char === delimiter) {
      pushField()
      i++
    } else if (char === '\r') {
      if (text[i + 1] === '\n') i++
      pushRow()
      i++
    } else if (char === '\n') {
      pushRow()
      i++
    } else {
      field += char
      i++
    }
  }

  if (field.length > 0 || row.length > 0) pushRow()

  return rows
}

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}
