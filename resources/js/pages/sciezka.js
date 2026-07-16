import Alpine from 'alpinejs'

/* currently open topic on /sciezka, drives the sidenav indicator */
Alpine.store('topic', { current: null })

/* same-page #anchor links (topic list in the /sciezka sidenav): skip the
   turbo visit and its transition animation, smooth-scroll to the target instead.
   Capture phase, so this runs before turbo's own click listener. */
document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target.closest('a[href]')
    if (!link || link.target) return
    const url = new URL(link.href)
    if (!url.hash || url.origin !== location.origin) return
    if (url.pathname !== location.pathname || url.search !== location.search) return
    const target = document.getElementById(url.hash.slice(1))
    if (!target) return

    event.preventDefault()
    history.replaceState(null, '', url.hash)

    /* collapse the mobile sidenav so it doesn't cover the scrolled-to topic */
    const sidenav = link.closest('.sidenav.opened')
    if (sidenav) {
      sidenav.classList.remove('opened')
      const handle = sidenav.querySelector('.mobile-menu-handle')
      if (handle) handle.textContent = 'Rozwiń ścieżkę v'
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  },
  true
)

function initSciezkaUrlSync() {
  const boxes = [...document.querySelectorAll('.topic-box')]
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
})
