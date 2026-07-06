document.addEventListener('turbo:load', async () => {
  const areas = [...document.querySelectorAll('textarea[data-code-editor]')]
  if (areas.length === 0) return

  const [
    { basicSetup, EditorView },
    { html },
    { acceptCompletion },
    { indentWithTab },
    { keymap },
  ] = await Promise.all([
    import('codemirror'),
    import('@codemirror/lang-html'),
    import('@codemirror/autocomplete'),
    import('@codemirror/commands'),
    import('@codemirror/view'),
  ])

  for (const area of areas) {
    if (area.nextElementSibling?.classList.contains('cm-editor')) area.nextElementSibling.remove()

    const view = new EditorView({
      doc: area.value,
      extensions: [
        basicSetup,
        html(),
        keymap.of([{ key: 'Tab', run: acceptCompletion }, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) area.value = update.state.doc.toString()
        }),
        EditorView.theme({
          '&': {
            fontSize: '13px',
            border: '1px solid #cacaca',
            borderRadius: '4px',
            maxHeight: '70vh',
          },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content, .cm-gutter': { minHeight: `${(Number(area.rows) || 10) * 19}px` },
        }),
      ],
    })
    area.after(view.dom)
    area.hidden = true
  }
})
