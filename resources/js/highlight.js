import hljs from 'highlight.js/lib/core'
import cpp from 'highlight.js/lib/languages/cpp'
import python from 'highlight.js/lib/languages/python'

hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('python', python)
hljs.configure({ languages: ['cpp', 'python'] })

export function highlightCode(code, lang) {
  code = String(code ?? '')
  if (typeof lang === 'string' && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value
  }
  return hljs.highlightAuto(code).value
}
window.highlightCode = highlightCode

function highlightMarked() {
  document.querySelectorAll('main .code-block pre code').forEach((el) => {
    if (!el.dataset.highlighted) hljs.highlightElement(el)
  })
}

document.addEventListener('turbo:load', highlightMarked)
