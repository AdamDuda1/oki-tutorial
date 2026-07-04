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
