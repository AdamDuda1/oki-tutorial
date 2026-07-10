import Alpine from 'alpinejs'

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

Alpine.data('expandable', () => ({
  open: false,
  init() {
    this.open = this.$el.querySelector('.box')?.classList.contains('open') ?? false
  },
}))

Alpine.data('copyable', () => ({
  copied: false,
  copy(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = true
      setTimeout(() => (this.copied = false), 1500)
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
