document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
  if (event.key.toLowerCase() !== 'f') return

  const input = document.querySelector('input[data-search-shortcut]')
  if (!input) return

  event.preventDefault()
  input.focus()
  input.select()
})
