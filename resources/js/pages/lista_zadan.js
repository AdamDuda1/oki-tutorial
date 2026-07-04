import TomSelect from 'tom-select'
import 'tom-select/dist/css/tom-select.css'

function initZadaniaFilterSelect(selector, param) {
  if (!document.querySelector(selector)) return
  new TomSelect(selector, {
    plugins: ['remove_button'],
    maxOptions: null,
    onChange(values) {
      const url = new URL(location.href)
      url.searchParams.delete(param)
      for (const v of values) url.searchParams.append(param, v)
      url.searchParams.delete('page')
      history.replaceState(null, '', url)
      fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
        .then((res) => res.text())
        .then((html) => {
          const table = document.querySelector('#zadania-table')
          if (table) table.innerHTML = html
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
