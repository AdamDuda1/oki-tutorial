import * as DarkReader from 'darkreader'

const STORAGE_KEY = 'dark-mode'

const darkReaderConfig = {
  brightness: 100,
  contrast: 90,
  sepia: 0,
}

function isEnabled() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function apply(enabled) {
  if (enabled) {
    DarkReader.enable(darkReaderConfig)
  } else {
    DarkReader.disable()
  }
  document.documentElement.classList.toggle('dark-mode', enabled)
  for (const el of document.querySelectorAll('[data-dark-mode-toggle]')) {
    el.checked = enabled
  }
}

function setEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
  apply(enabled)
}

apply(isEnabled())
document.addEventListener('turbo:load', () => apply(isEnabled()))
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-dark-mode-toggle]')) {
    setEnabled(e.target.checked)
  }
})
