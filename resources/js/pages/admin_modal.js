/* Edycja w modalu (iframe z ?embed=1) bez opuszczania strony */

const IS_EMBEDDED = new URLSearchParams(location.search).has('embed')

function openEditModal(href) {
  const overlay = document.createElement('div')
  overlay.className = 'edit-modal-overlay'
  overlay.innerHTML = `
    <div class="edit-modal">
      <button type="button" class="edit-modal-close" title="Zamknij (Esc)">✕</button>
      <iframe></iframe>
    </div>`

  const iframe = overlay.querySelector('iframe')
  let loads = 0

  const close = () => {
    overlay.remove()
    if (loads > 1 && !IS_EMBEDDED) {
      window.Turbo ? window.Turbo.visit(location.href, { action: 'replace' }) : location.reload()
    }
  }

  iframe.addEventListener('load', () => {
    loads++
    try {
      const url = new URL(iframe.contentWindow.location.href)
      if (!url.searchParams.has('embed')) {
        loads++
        close()
      }
    } catch {}
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('.edit-modal-close')) close()
  })
  overlay.closeEditModal = close

  iframe.src = href + (href.includes('?') ? '&' : '?') + 'embed=1'
  document.body.appendChild(overlay)
}

function closeTopModal() {
  const overlays = document.querySelectorAll('.edit-modal-overlay')
  if (overlays.length > 0) {
    overlays[overlays.length - 1].closeEditModal()
    return true
  }
  return false
}

/* capture, żeby ubiec click-listener turbo */
document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target.closest('a[data-modal-edit]')
    if (!link) return
    event.preventDefault()
    event.stopPropagation()
    openEditModal(link.getAttribute('href'))
  },
  true
)

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  if (closeTopModal()) return
  if (IS_EMBEDDED && window.parent !== window) {
    window.parent.postMessage('close-edit-modal', location.origin)
  }
})

window.addEventListener('message', (event) => {
  if (event.origin === location.origin && event.data === 'close-edit-modal') closeTopModal()
})

document.addEventListener('turbo:before-cache', () => {
  document.querySelectorAll('.edit-modal-overlay').forEach((o) => o.remove())
})
