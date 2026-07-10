const THEME = 'dark-plus'
let highlighter = null

Promise.all([
  import('shiki/core'),
  import('shiki/engine/javascript'),
  import('@shikijs/langs-precompiled/cpp'),
  import('@shikijs/langs-precompiled/python'),
  import('@shikijs/themes/dark-plus'),
])
  .then(([core, engine, cpp, python, darkPlus]) =>
    core.createHighlighterCore({
      themes: [darkPlus.default],
      langs: [cpp.default, python.default],
      engine: engine.createJavaScriptRegexEngine(),
    })
  )
  .then((h) => {
    highlighter = h
    highlightMarked()
  })
  .catch((e) => console.warn('Shiki init failed — kod bez kolorowania', e))

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

function toLangId(lang) {
  lang = String(lang || '')
    .toLowerCase()
    .replace('++', 'pp')
  if (lang === 'py') lang = 'python'
  return highlighter.getLoadedLanguages().includes(lang) ? lang : 'cpp'
}

export function highlightCode(code, lang) {
  code = String(code ?? '')
  if (!highlighter) return escapeHtml(code)
  const html = highlighter.codeToHtml(code, { lang: toLangId(lang), theme: THEME })
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.querySelector('code').innerHTML
}
window.highlightCode = highlightCode

function highlightMarked() {
  if (!highlighter) return
  document.querySelectorAll('main .code-block pre code').forEach((el) => {
    if (el.dataset.highlighted) return
    const lang = (el.className.match(/language-([\w+-]+)/) || [])[1]
    el.innerHTML = highlightCode(el.textContent, lang)
    el.dataset.highlighted = 'yes'
  })
}

document.addEventListener('turbo:load', highlightMarked)
