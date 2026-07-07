import TomSelect from 'tom-select'
import 'tom-select/dist/css/tom-select.css'

let tableFetch = null

function initZadaniaFilterSelect(selector, param) {
  const select = document.querySelector(selector)
  if (!select) return
  if (select.nextElementSibling?.classList.contains('ts-wrapper')) select.nextElementSibling.remove()

  new TomSelect(select, {
    plugins: ['remove_button'],
    maxOptions: null,
    onChange(values) {
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
}

document.addEventListener('turbo:load', () => {
  // /lista_zadan filters
  initZadaniaFilterSelect('#poziom-select', 'poziom[]')
  initZadaniaFilterSelect('#zrodla-select', 'zrodlo[]')
  initZadaniaFilterSelect('#tagi-filter-select', 'tagi[]')
})
