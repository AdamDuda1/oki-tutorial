/*
  I copied this part from stack, dont ask me how it works
 */

import 'katex/dist/katex.min.css'
import renderMathInElement from 'katex/contrib/auto-render'

const DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
  { left: '$', right: '$', display: false },
]

export function renderMath(el) {
  if (!el) return
  renderMathInElement(el, { delimiters: DELIMITERS, throwOnError: false })
}

window.renderMath = renderMath

const URL_RE = /https?:\/\/[^\s<]+/gi

function appendLinkified(el, text) {
  let last = 0
  let match
  URL_RE.lastIndex = 0
  while ((match = URL_RE.exec(text))) {
    if (match.index > last) {
      el.appendChild(document.createTextNode(text.slice(last, match.index)))
    }
    let url = match[0]
    const trailing = url.match(/[.,;:!?)\]}'"]+$/)
    let tail = ''
    if (trailing) {
      tail = trailing[0]
      url = url.slice(0, -tail.length)
    }
    const a = document.createElement('a')
    a.href = url
    a.textContent = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    el.appendChild(a)
    if (tail) el.appendChild(document.createTextNode(tail))
    last = match.index + match[0].length
  }
  if (last < text.length) {
    el.appendChild(document.createTextNode(text.slice(last)))
  }
}

export function renderRichText(el, text) {
  if (!el) return
  el.textContent = ''
  appendLinkified(el, text ?? '')
  renderMath(el)
}

window.renderRichText = renderRichText

function renderMarked() {
  document.querySelectorAll('[data-katex]').forEach(renderMath)
}

document.addEventListener('turbo:load', renderMarked)
