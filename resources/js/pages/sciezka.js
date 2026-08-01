import Alpine from 'alpinejs'

Alpine.store('topic', { current: null })

const OSTATNIA_SCIEZKA_KEY = 'ostatnia_sciezka'
const YEAR_IN_SECONDS = 60 * 60 * 24 * 365

function rememberPosition() {
  const poziom = location.pathname.match(/^\/sciezka\/(\d+)\/?$/)?.[1]
  if (!poziom) return
  const temat = Alpine.store('topic').current
  const value = temat ? `${poziom}.${temat}` : poziom
  document.cookie =
    `${OSTATNIA_SCIEZKA_KEY}=${value}; path=/; max-age=${YEAR_IN_SECONDS}; samesite=lax` +
    (location.protocol === 'https:' ? '; secure' : '')
}

/* the effect fires on every topic change; turbo:load covers switching levels */
Alpine.effect(() => rememberPosition())
document.addEventListener('turbo:load', rememberPosition)

/* same-page #anchor links (topic list in the /sciezka sidenav): skip the
   turbo visit and its transition animation, smooth-scroll to the target instead.
   Capture phase, so this runs before turbo's own click listener. ~adamd */
document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
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

    scrollTopicIntoView(target)
  },
  true
)

function scrollTopicIntoView(target) {
  const scroll = () => target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  scroll()

  const box = target.querySelector(':scope > .box')
  if (!box || box.classList.contains('open')) return
  const settle = (event) => {
    if (event.target !== box || event.propertyName !== 'grid-template-rows') return
    box.removeEventListener('transitionend', settle)
    scroll()
  }
  box.addEventListener('transitionend', settle)
}

document.addEventListener('click', (event) => {
  const facade = event.target.closest('.yt-facade')
  if (!facade) return
  const src = facade.dataset.embed
  const iframe = document.createElement('iframe')
  iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1'
  iframe.title = 'YouTube video player'
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  iframe.referrerPolicy = 'strict-origin-when-cross-origin'
  iframe.allowFullscreen = true
  facade.replaceWith(iframe)
})

function keepScrollSlack() {
  const content = document.querySelector('.sciezka-app > .content')
  const last = [...(content?.querySelectorAll('.topic-box') ?? [])].pop()
  if (!last) return

  const basePadding = 20
  const update = () => {
    const slack = content.clientHeight - last.offsetHeight - basePadding
    const padding = `${Math.max(basePadding, slack)}px`
    if (content.style.paddingBottom !== padding) content.style.paddingBottom = padding
  }

  const observer = new ResizeObserver(update)
  observer.observe(last)
  observer.observe(content)
  update()
}

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

/* `/` redirects here as /sciezka/:id?temat=:t (SciezkaController.home). The server already
   expanded that topic via autoOpenId, so all that is left is scrolling to it and turning
   ?temat into a #hash, so the URL looks like any other visit to a topic. Has to run on
   turbo:load — inside the inline script in the body `location` is still the old one. */
function openRememberedTopic() {
  const temat = new URLSearchParams(location.search).get('temat')
  if (!temat) return
  history.replaceState(null, '', location.pathname + '#' + temat)
  document.getElementById(temat)?.scrollIntoView()
}

document.addEventListener('turbo:load', () => {
  // initSciezkaUrlSync()
  openRememberedTopic()
  keepScrollSlack()
})
