import '@hotwired/turbo'
import Alpine from 'alpinejs'

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

  dragStart(idx) { this.srcIdx = idx },

  dragOver(event, idx) {
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

Alpine.data('materialyEditor', () => ({
  poziomy: [],
  dragging: null, over: null, insertPos: null,

  init() {
    const el = document.getElementById('materialy-data')
    if (el) this.poziomy = JSON.parse(el.textContent)
  },

  startPoziom(pi) { this.dragging = { type: 'poziom', pi } },
  startTemat(pi, ti) { this.dragging = { type: 'temat', pi, ti } },

  overPoziom(pi, event) {
    if (this.dragging?.type !== 'poziom') return
    const r = event.currentTarget.getBoundingClientRect()
    this.over = { type: 'poziom', pi }
    this.insertPos = event.clientY < r.top + r.height / 2 ? 'before' : 'after'
  },

  overTemat(pi, ti, event) {
    if (this.dragging?.type !== 'temat' || this.dragging.pi !== pi) return
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
    } else if (d.type === 'temat' && o.type === 'temat' && d.pi === o.pi && d.ti !== o.ti) {
      const items = [...this.poziomy[d.pi].tematy]
      const [item] = items.splice(d.ti, 1)
      let at = this.insertPos === 'before' ? o.ti : o.ti + 1
      if (o.ti > d.ti) at--
      items.splice(at, 0, item)
      this.poziomy[d.pi].tematy = items
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

Alpine.start()
