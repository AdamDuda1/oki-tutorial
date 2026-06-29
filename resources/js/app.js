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
