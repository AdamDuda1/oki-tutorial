import Alpine from 'alpinejs'

Alpine.data('taskPicker', () => ({
  zadania: {},
  uzycia: {},
  listy: { zadaniaCwiczeniowe: [], zadaniaNaPomysl: [], zadaniaTreningowe: [] },
  szukaj: { zadaniaCwiczeniowe: '', zadaniaNaPomysl: '', zadaniaTreningowe: '' },
  sekcje: [
    { klucz: 'zadaniaCwiczeniowe', nazwa: 'Zadania ćwiczeniowe' },
    { klucz: 'zadaniaNaPomysl', nazwa: 'Zadania na pomysł' },
    { klucz: 'zadaniaTreningowe', nazwa: 'Zadania treningowe' },
  ],

  init() {
    const el = document.getElementById('zadania-picker-data')
    if (!el) return
    const dane = JSON.parse(el.textContent)
    for (const z of dane.zadania) this.zadania[z.id] = z
    this.uzycia = dane.uzycia
    this.listy = dane.wybrane
  },

  zadanie(id) {
    return this.zadania[id] ?? {
      id, nazwa: '(zadanie nie istnieje)', zrodlo: '', published: true,
      skrot: '?', kolor: 'var(--text-secondary)',
    }
  },

  badgeStyle(id) {
    const kolor = this.zadanie(id).kolor
    return `color: ${kolor}; background-color: color-mix(in srgb, ${kolor} 10%, transparent);`
  },

  wTychListach(id) {
    return Object.values(this.listy).some((lista) => lista.includes(id))
  },

  /* użycia w innych tematach + w listach tego formularza;
     wLiscie=true nie liczy wiersza, przy którym pokazujemy ostrzeżenie */
  liczbaUzyc(id, wLiscie = false) {
    let n = this.uzycia[id]?.ile ?? 0
    for (const klucz in this.listy) {
      for (const x of this.listy[klucz]) if (x === id) n++
    }
    return wLiscie ? n - 1 : n
  },

  gdzieUzyte(id) {
    const czesci = (this.uzycia[id]?.gdzie ?? []).map((t) => `#${t.id} ${t.nazwa}`)
    if (this.wTychListach(id)) czesci.push('ten temat')
    return 'Użyte w: ' + czesci.join(', ')
  },

  pokazUzycia(id) {
    const linie = (this.uzycia[id]?.gdzie ?? []).map((t) => `* ${t.nazwa} (#${t.id})`)
    if (this.wTychListach(id)) linie.push('* ten temat')
    Alpine.store('modal').show(`Zadanie #${id} użyte w tematach:`, linie.join('\n'))
  },

  wyniki(klucz) {
    const q = this.szukaj[klucz].trim().toLowerCase()
    if (!q) return []
    const poId = /^\d+$/.test(q)
    return Object.values(this.zadania)
      .filter((z) => !this.listy[klucz].includes(z.id))
      .filter((z) =>
        poId
          ? String(z.id).startsWith(q)
          : z.nazwa.toLowerCase().includes(q) || (z.zrodlo ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  },

  dodaj(klucz, id) {
    if (!this.listy[klucz].includes(id)) this.listy[klucz].push(id)
    this.szukaj[klucz] = ''
  },

  dodajPierwsze(klucz) {
    const w = this.wyniki(klucz)
    if (w.length > 0) this.dodaj(klucz, w[0].id)
  },

  usun(klucz, i) {
    this.listy[klucz].splice(i, 1)
  },

  przesun(klucz, i, kierunek) {
    const j = i + kierunek
    const lista = this.listy[klucz]
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  },
}))
