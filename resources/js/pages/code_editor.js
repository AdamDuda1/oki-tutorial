document.addEventListener('turbo:load', async () => {
  const areas = [...document.querySelectorAll('textarea[data-code-editor]')]
  if (areas.length === 0) return

  const [
    { basicSetup, EditorView },
    { html, htmlLanguage },
    { acceptCompletion, snippetCompletion },
    { indentWithTab },
    { keymap },
  ] = await Promise.all([
    import('codemirror'),
    import('@codemirror/lang-html'),
    import('@codemirror/autocomplete'),
    import('@codemirror/commands'),
    import('@codemirror/view'),
  ])

  const edgeSnippets = [
    snippetCompletion("@custom.sciezka.expandableBox({ title: '${tytuł}' })\n  ${treść}\n@end", {
      label: '@custom.sciezka.expandableBox',
      detail: 'rozwijana sekcja',
      type: 'function',
    }),
    snippetCompletion("@!custom.header({ text: '${tekst}', level: ${2} })", {
      label: '@!custom.header',
      detail: 'nagłówek',
      type: 'function',
    }),
    snippetCompletion("@!custom.link({ href: '${url}', text: '${tekst}' })", {
      label: '@!custom.link',
      detail: 'odnośnik',
      type: 'function',
    }),
    snippetCompletion(
      "@!custom.modalLink({ title: '${tytuł}', text: '${tekst odnośnika}', body: '${treść}' })",
      {
        label: '@!custom.modalLink',
        detail: 'odnośnik otwierający okienko z tekstem',
        type: 'function',
      }
    ),
    snippetCompletion(
      "@custom.modalLink({ title: '${tytuł}', text: '${tekst odnośnika}' })\n  ${treść}\n@end",
      {
        label: '@custom.modalLink',
        detail: 'okienko z dłuższą treścią (blok)',
        type: 'function',
      }
    ),
    snippetCompletion("@!custom.code({ lang: '${python}', code: `${kod}` })", {
      label: '@!custom.code',
      detail: 'blok kodu z przyciskiem kopiowania',
      type: 'function',
    }),
    snippetCompletion("@custom.callout({ type: '${info}', title: '${tytuł}' })\n  ${treść}\n@end", {
      label: '@custom.callout',
      detail: 'ramka (info / warning / danger / success)',
      type: 'function',
    }),
  ]

  const edgeComponents = (context) => {
    const word = context.matchBefore(/@!?[\w.]*/)
    if (!word && !context.explicit) return null
    return { from: word ? word.from : context.pos, options: edgeSnippets, validFor: /^@!?[\w.]*$/ }
  }

  for (const area of areas) {
    if (area.nextElementSibling?.classList.contains('cm-editor')) area.nextElementSibling.remove()

    const view = new EditorView({
      doc: area.value,
      extensions: [
        basicSetup,
        html(),
        htmlLanguage.data.of({ autocomplete: edgeComponents }),
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
