import Alpine from 'alpinejs'
import TomSelect from 'tom-select'

Alpine.data('levelEditor', () => ({
  levels: [],
  srcIdx: null,
  targetIdx: null,
  insertPos: null,

  init() {
    const el = document.getElementById('levels-data')
    if (el)
      this.levels = JSON.parse(el.dataset.json).map((l) => ({ ...l, color: l.color || '#000000' }))
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
    if (src === null || target === null || src === target) {
      this._clear()
      return
    }
    const items = [...this.levels]
    const [item] = items.splice(src, 1)
    let at = pos === 'before' ? target : target + 1
    if (target > src) at--
    items.splice(at, 0, item)
    this.levels = items
    this._clear()
  },

  _clear() {
    this.srcIdx = null
    this.targetIdx = null
    this.insertPos = null
  },
}))

Alpine.data('materialyEditor', () => ({
  poziomy: [],
  dragging: null,
  over: null,
  insertPos: null,

  init() {
    const el = document.getElementById('materialy-data')
    if (el) this.poziomy = JSON.parse(el.dataset.json)
  },

  startPoziom(pi, event) {
    if (event.target !== event.currentTarget) return
    // Firefox won't start a drag unless dataTransfer has data
    event.dataTransfer.setData('text/plain', '')
    event.dataTransfer.effectAllowed = 'move'
    this.dragging = { type: 'poziom', pi }
  },
  startTemat(pi, ti, event) {
    if (event.target !== event.currentTarget) return
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
    const d = this.dragging,
      o = this.over
    if (!d || !o) {
      this._clear()
      return
    }
    if (d.type === 'poziom' && o.type === 'poziom' && d.pi !== o.pi) {
      const items = [...this.poziomy]
      const [item] = items.splice(d.pi, 1)
      let at = this.insertPos === 'before' ? o.pi : o.pi + 1
      if (o.pi > d.pi) at--
      items.splice(at, 0, item)
      this.poziomy = items
    } else if (d.type === 'temat' && o.type === 'temat') {
      if (d.pi === o.pi && d.ti === o.ti) {
        this._clear()
        return
      }
      const [item] = this.poziomy[d.pi].tematy.splice(d.ti, 1)
      let at = this.insertPos === 'before' ? o.ti : o.ti + 1
      if (d.pi === o.pi && o.ti > d.ti) at--
      this.poziomy[o.pi].tematy.splice(at, 0, item)
    } else if (d.type === 'temat' && o.type === 'poziom' && d.pi !== o.pi) {
      const [item] = this.poziomy[d.pi].tematy.splice(d.ti, 1)
      this.poziomy[o.pi].tematy.push(item)
    }
    this._clear()
  },

  _clear() {
    this.dragging = null
    this.over = null
    this.insertPos = null
  },
}))

Alpine.data('materialsEditor', () => ({
  materials: [],
  init() {
    const el = document.getElementById('materials-data')
    if (el) this.materials = JSON.parse(el.dataset.json)
  },
  add() {
    this.materials.push({ url: '', opis: '' })
  },
  remove(i) {
    this.materials.splice(i, 1)
  },
}))

document.addEventListener('turbo:load', () => {
  const tagi = document.querySelector('#tagi-select')
  if (tagi) {
    if (tagi.nextElementSibling?.classList.contains('ts-wrapper')) tagi.nextElementSibling.remove()
    new TomSelect(tagi, {
      plugins: ['remove_button'],
      maxOptions: null,
      create: false,
    })
  }
})

function normalizujNazweZadania(s) {
  return s
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function podobienstwoNazw(a, b) {
  const na = normalizujNazweZadania(a)
  const nb = normalizujNazweZadania(b)
  if (!na || !nb) return 0
  if (na === nb || na.includes(nb) || nb.includes(na)) return 1

  const slowaA = new Set(na.split(' '))
  const slowaB = new Set(nb.split(' '))
  const wspolne = [...slowaA].filter((slowo) => slowaB.has(slowo)).length
  return wspolne / Math.max(slowaA.size, slowaB.size)
}

const PROG_PODOBIENSTWA_NAZWY = 0.6
const MIN_DLUGOSC_DO_SPRAWDZENIA = 4

document.addEventListener('turbo:load', () => {
  const nazwaInput = document.querySelector('#nazwa')
  const dataEl = document.querySelector('#zadania-nazwy-data')
  const warningEl = document.querySelector('#nazwa-podobne-warning')
  if (!nazwaInput || !dataEl || !warningEl) return

  const zadania = JSON.parse(dataEl.dataset.json || '[]')
  let timeoutId = null

  const sprawdz = () => {
    const wartosc = nazwaInput.value.trim()
    warningEl.textContent = ''

    if (wartosc.length < MIN_DLUGOSC_DO_SPRAWDZENIA) {
      warningEl.hidden = true
      return
    }

    const podobne = zadania
      .map((z) => ({ ...z, wynik: podobienstwoNazw(wartosc, z.nazwa) }))
      .filter((z) => z.wynik >= PROG_PODOBIENSTWA_NAZWY)
      .sort((a, b) => b.wynik - a.wynik)
      .slice(0, 5)

    if (!podobne.length) {
      warningEl.hidden = true
      return
    }

    warningEl.append('Serdecznie informuję, iż w aktualnej bazie znajdują się już zadania ')
    podobne.forEach((z, i) => {
      if (i > 0) warningEl.append(', ')
      const link = document.createElement('a')
      link.href = `/admin/edit_task/${z.idZadania}`
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = z.nazwa
      warningEl.append(link)
    })
    warningEl.append('. Pozdrawiam.')
    warningEl.hidden = false
  }

  nazwaInput.addEventListener('input', () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(sprawdz, 250)
  })
  sprawdz()
})

function podobienstwoZrodel(wpisane, zrodlo) {
  const a = normalizujNazweZadania(wpisane)
  const b = normalizujNazweZadania(zrodlo)
  if (!a || !b) return 0
  if (a === b) return 3
  if (b.startsWith(a)) return 2
  if (b.includes(a)) return 1.5

  const slowaA = new Set(a.split(' '))
  const slowaB = new Set(b.split(' '))
  const wspolne = [...slowaA].filter((slowo) => slowaB.has(slowo)).length
  return wspolne / Math.max(slowaA.size, slowaB.size)
}

const MAKS_PODPOWIEDZI_ZRODLA = 5

document.addEventListener('turbo:load', () => {
  const zrodloInput = document.querySelector('#zrodlo')
  const dataEl = document.querySelector('#zrodla-data')
  const listaEl = document.querySelector('#zrodlo-podpowiedzi')
  if (!zrodloInput || !dataEl || !listaEl) return

  const zrodla = JSON.parse(dataEl.dataset.json || '[]')

  const pokaz = () => {
    const wartosc = zrodloInput.value.trim()
    listaEl.textContent = ''

    if (wartosc.length < 2) {
      listaEl.hidden = true
      return
    }

    const podobne = zrodla
      .map((z) => ({ ...z, wynik: podobienstwoZrodel(wartosc, z.zrodlo) }))
      .filter((z) => z.wynik > 0 && z.zrodlo !== wartosc)
      .sort((a, b) => b.wynik - a.wynik || b.ile - a.ile)
      .slice(0, MAKS_PODPOWIEDZI_ZRODLA)

    if (!podobne.length) {
      listaEl.hidden = true
      return
    }

    for (const z of podobne) {
      const przycisk = document.createElement('button')
      przycisk.type = 'button'
      przycisk.textContent = z.zrodlo
      przycisk.title = `Użyte w ${z.ile} ${z.ile === 1 ? 'zadaniu' : 'zadaniach'}`
      przycisk.addEventListener('click', () => {
        zrodloInput.value = z.zrodlo
        zrodloInput.dispatchEvent(new Event('input', { bubbles: true }))
        zrodloInput.focus()
      })
      listaEl.append(przycisk)
    }
    listaEl.hidden = false
  }

  zrodloInput.addEventListener('input', pokaz)
  zrodloInput.addEventListener('focus', pokaz)
})
