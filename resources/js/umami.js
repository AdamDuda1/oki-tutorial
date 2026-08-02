const MAX_DLUGOSC = 500
const KONTEKST = ['temat', 'grupa', 'zadanie', 'material', 'tryb']

export function track(nazwa, dane) {
  window.umami?.track?.(nazwa, dane)
}

function kontekst(el) {
  const dane = {}
  for (const klucz of KONTEKST) {
    const zrodlo = el.closest(`[data-track-${klucz}]`)
    const wartosc = zrodlo?.dataset[`track${klucz[0].toUpperCase()}${klucz.slice(1)}`]
    if (wartosc) dane[klucz] = wartosc.slice(0, MAX_DLUGOSC)
  }
  return dane
}

function czyOtwiera(trigger) {
  const root = trigger.closest('[x-data]')
  if (!root) return true
  const box = [...root.querySelectorAll('.box')].find((b) => b.closest('[x-data]') === root)
  return box ? !box.classList.contains('open') : true
}

document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0) return
    const el = event.target.closest('[data-track]')
    if (!el) return
    if (el.matches('[data-toggle], .toggle') && !czyOtwiera(el)) return
    track(el.dataset.track, kontekst(el))
  },
  true
)

document.addEventListener('turbo:load', () => {
  for (const el of document.querySelectorAll('[data-track-auto]')) {
    const nazwa = el.dataset.trackAuto
    el.removeAttribute('data-track-auto')
    track(nazwa, kontekst(el))
  }
})

const SZUKANIE_DEBOUNCE = 1000
const SZUKANIE_MIN = 3
let szukanieTimer = null

document.addEventListener('input', (event) => {
  const input = event.target.closest('[data-track-szukanie]')
  if (!input) return
  clearTimeout(szukanieTimer)
  const fraza = input.value.trim()
  if (fraza.length < SZUKANIE_MIN) return
  szukanieTimer = setTimeout(
    () => track('szukanie', { fraza: fraza.slice(0, MAX_DLUGOSC) }),
    SZUKANIE_DEBOUNCE
  )
})
