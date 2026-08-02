import TomSelect from 'tom-select'
import 'tom-select/dist/css/tom-select.css'
import { track } from '../umami.js'

let tableFetch = null

function initZadaniaFilterSelect(selector, param) {
  const select = document.querySelector(selector)
  if (!select) return
  if (select.nextElementSibling?.classList.contains('ts-wrapper'))
    select.nextElementSibling.remove()

  let zainicjowany = false

  new TomSelect(select, {
    plugins: ['remove_button'],
    maxOptions: null,
    onChange(values) {
      if (zainicjowany && values.length > 0) {
        track('filtr-zmieniony', { filtr: param.replace('[]', ''), wartosci: values.join(', ') })
      }
      const url = new URL(location.href)
      url.searchParams.delete(param)
      for (const v of values) url.searchParams.append(param, v)
      url.searchParams.delete('page')
      history.replaceState(null, '', url)
      tableFetch?.abort()
      tableFetch = new AbortController()
      fetch(url, { headers: { 'X-Requested-With': 'fetch' }, signal: tableFetch.signal })
        .then((res) => res.text())
        .then((html) => {
          const table = document.querySelector('#zadania-table')
          if (table) table.innerHTML = html
        })
        .catch((err) => {
          if (err.name !== 'AbortError') throw err
        })
    },
  })

  zainicjowany = true
}

document.addEventListener('turbo:load', () => {
  // /lista_zadan filters
  initZadaniaFilterSelect('#poziom-select', 'poziom[]')
  initZadaniaFilterSelect('#zrodla-select', 'zrodlo[]')
  initZadaniaFilterSelect('#tagi-filter-select', 'tagi[]')
})
