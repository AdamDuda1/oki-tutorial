import Alpine from 'alpinejs'

function podzielRozwiazania(kod) {
  const sekcje = []
  let biezaca = { nazwa: null, linie: [] }
  for (const linia of String(kod ?? '').split('\n')) {
    const dopasowanie = linia.match(/^\/{4}\s*(.*)$/)
    if (dopasowanie) {
      sekcje.push(biezaca)
      biezaca = { nazwa: dopasowanie[1].trim() || 'Rozwiązanie', linie: [] }
    } else {
      biezaca.linie.push(linia)
    }
  }
  sekcje.push(biezaca)
  return sekcje.map((s) => ({ nazwa: s.nazwa, kod: s.linie.join('\n').trim() })).filter((s) => s.kod)
}

Alpine.store('modal', {
  open: false,
  title: '',
  body: '',
  code: false, // false = zwykły tekst; nazwa języka (np. 'cpp') = blok kodu
  html: '',
  get sections() {
    return this.code ? podzielRozwiazania(this.body) : []
  },
  show(title, body, code = false) {
    this.title = title
    this.body = body
    this.code = code
    this.html = ''
    this.open = true
  },
  showHtml(title, html) {
    this.title = title
    this.body = ''
    this.code = false
    this.html = html
    this.open = true
  },
  hide() {
    this.open = false
  },
})

Alpine.data('expandable', () => ({
  open: false,
  init() {
    this.open = this.$el.querySelector('.box')?.classList.contains('open') ?? false
  },
}))

Alpine.data('copyable', () => ({
  copied: null,
  copy(text, id = true) {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = id
      setTimeout(() => (this.copied = null), 1500)
    })
  },
}))

Alpine.data('alert', function (duration = 5000, delay = 80) {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, delay)
      setTimeout(() => {
        this.dismiss()
      }, delay + duration)
    },
  }
})
