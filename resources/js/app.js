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
