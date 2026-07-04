/* Ctrl+S / Cmd+S wysyła formularz oznaczony atrybutem data-save-shortcut
   (duże formularze edycji w adminie) zamiast zapisywać HTML strony. */
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
  if (event.key.toLowerCase() !== 's') return

  const form = document.querySelector('form[data-save-shortcut]')
  if (!form) return

  event.preventDefault()
  form.requestSubmit()
})
