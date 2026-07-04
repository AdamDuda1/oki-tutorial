import '@hotwired/turbo'
import Alpine from 'alpinejs'
import TomSelect from 'tom-select'
import 'tom-select/dist/css/tom-select.css'

if (import.meta.env.VITE_FEATURE_ANIMATE_PATH_CHANGES === 'true') {
  const EXIT_MS = 130

  let exitStart = 0

  document.addEventListener('turbo:click', () => {
    exitStart = Date.now()
    document.querySelector('main')?.classList.add('page-exit')
  })

  document.addEventListener('turbo:before-render', (event) => {
    const remaining = EXIT_MS - (Date.now() - exitStart)
    if (remaining > 0) {
      event.preventDefault()
      setTimeout(() => event.detail.resume(), remaining)
    }
  })

  document.addEventListener('turbo:render', () => {
    const main = document.querySelector('main')
    if (!main) return
    main.classList.remove('page-exit')
    main.classList.add('page-enter')
    main.addEventListener('animationend', () => main.classList.remove('page-enter'), { once: true })
  })
}

window.theme_switch = function() {
  document.querySelector(':root')
    .style.setProperty('--background', 'black')
  document.querySelector(':root')
    .style.setProperty('--text', 'white')
  document.querySelector(':root').style.setProperty('--text', 'white')
  document.querySelector(':root').style.setProperty('--text', 'white')
}

function theme_update() {

}


Alpine.data('levelEditor', () => ({
  levels: [],
  srcIdx: null, targetIdx: null, insertPos: null,

  init() {
    const el = document.getElementById('levels-data')
    if (el) this.levels = JSON.parse(el.textContent).map(l => ({ ...l, color: l.color || '#000000' }))
  },

  dragStart(idx, event) {
    // Firefox won't start a drag unless dataTransfer has data
    event.dataTransfer.setData('text/plain', '')
    event.dataTransfer.effectAllowed = 'move'
    this.srcIdx = idx
  },

  dragOver(event, idx) {
    event.dataTransfer.dropEffect = 'move'
    const rect = event.currentTarget.getBoundingClientRect()
    this.targetIdx = idx
    this.insertPos = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  },

  drop() {
    const { srcIdx: src, targetIdx: target, insertPos: pos } = this
    if (src === null || target === null || src === target) { this._clear(); return }
    const items = [...this.levels]
    const [item] = items.splice(src, 1)
    let at = pos === 'before' ? target : target + 1
    if (target > src) at--
    items.splice(at, 0, item)
    this.levels = items
    this._clear()
  },

  _clear() { this.srcIdx = null; this.targetIdx = null; this.insertPos = null },
}))

Alpine.store('modal', {
  open: false,
  title: '',
  body: '',
  code: false,
  show(title, body, code = false) {
    this.title = title; this.body = body; this.code = code; this.open = true
  },
  hide() { this.open = false },
})

Alpine.data('materialyEditor', () => ({
  poziomy: [],
  dragging: null, over: null, insertPos: null,

  init() {
    const el = document.getElementById('materialy-data')
    if (el) this.poziomy = JSON.parse(el.textContent)
  },

  startPoziom(pi, event) {
    // Firefox won't start a drag unless dataTransfer has data
    event.dataTransfer.setData('text/plain', '')
    event.dataTransfer.effectAllowed = 'move'
    this.dragging = { type: 'poziom', pi }
  },
  startTemat(pi, ti, event) {
    event.dataTransfer.setData('text/plain', '')
    event.dataTransfer.effectAllowed = 'move'
    this.dragging = { type: 'temat', pi, ti }
  },

  overPoziom(pi, event) {
    if (!this.dragging) return
    event.dataTransfer.dropEffect = 'move'
    if (this.dragging.type === 'poziom') {
      const r = event.currentTarget.getBoundingClientRect()
      this.over = { type: 'poziom', pi }
      this.insertPos = event.clientY < r.top + r.height / 2 ? 'before' : 'after'
    } else {
      // temat dragged over a poziom block (not over one of its rows) -> drop appends
      this.over = { type: 'poziom', pi }
      this.insertPos = 'into'
    }
  },

  overTemat(pi, ti, event) {
    if (this.dragging?.type !== 'temat') return
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    const r = event.currentTarget.getBoundingClientRect()
    this.over = { type: 'temat', pi, ti }
    this.insertPos = event.clientY < r.top + r.height / 2 ? 'before' : 'after'
  },

  drop() {
    const d = this.dragging, o = this.over
    if (!d || !o) { this._clear(); return }
    if (d.type === 'poziom' && o.type === 'poziom' && d.pi !== o.pi) {
      const items = [...this.poziomy]
      const [item] = items.splice(d.pi, 1)
      let at = this.insertPos === 'before' ? o.pi : o.pi + 1
      if (o.pi > d.pi) at--
      items.splice(at, 0, item)
      this.poziomy = items
    } else if (d.type === 'temat' && o.type === 'temat') {
      if (d.pi === o.pi && d.ti === o.ti) { this._clear(); return }
      const [item] = this.poziomy[d.pi].tematy.splice(d.ti, 1)
      let at = this.insertPos === 'before' ? o.ti : o.ti + 1
      if (d.pi === o.pi && o.ti > d.ti) at--
      this.poziomy[o.pi].tematy.splice(at, 0, item)
    } else if (d.type === 'temat' && o.type === 'poziom') {
      const [item] = this.poziomy[d.pi].tematy.splice(d.ti, 1)
      this.poziomy[o.pi].tematy.push(item)
    }
    this._clear()
  },

  _clear() { this.dragging = null; this.over = null; this.insertPos = null },
}))

Alpine.data('materialsEditor', () => ({
  materials: [],
  init() {
    const el = document.getElementById('materials-data')
    if (el) this.materials = JSON.parse(el.textContent)
  },
  add() { this.materials.push({ url: '', opis: '' }) },
  remove(i) { this.materials.splice(i, 1) },
}))

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

/* currently open topic on /sciezka, drives the sidenav indicator */
Alpine.store('topic', { current: null })

Alpine.start()

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

function initSciezkaUrlSync() {
  const boxes = [...document.querySelectorAll('.topic_box')]
  if (boxes.length === 0) return

  const visible = new Set()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else visible.delete(entry.target)
      }
      const current = boxes.find((b) => visible.has(b))
      if (current && location.hash !== '#' + current.id) {
        history.replaceState(null, '', '#' + current.id)
      }
    },
    { rootMargin: '0px 0px -55% 0px' }
  )
  boxes.forEach((b) => observer.observe(b))
}

document.addEventListener('turbo:load', () => {
  // initSciezkaUrlSync()

  // /lista_zadan filters
  initZadaniaFilterSelect('#poziom-select', 'poziom[]')
  initZadaniaFilterSelect('#zrodla-select', 'zrodlo[]')
  initZadaniaFilterSelect('#tagi-filter-select', 'tagi[]')

  // admin task form: tag picker that can create new tags
  if (document.querySelector('#tagi-select')) {
    new TomSelect('#tagi-select', {
      plugins: ['remove_button'],
      maxOptions: null,
      create: true,
      persist: false,
      createOnBlur: true,
    })
  }
})
