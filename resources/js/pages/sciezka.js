import Alpine from 'alpinejs'

/* currently open topic on /sciezka, drives the sidenav indicator */
Alpine.store('topic', { current: null })

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
})
