import { test } from '@japa/runner'
import {
  kategoriaZgloszenia,
  mailtoOdpowiedz,
  ulozKarte,
  zbudujZgloszenia,
} from '#services/formularz_kontaktowy'

// tak, to jest ai. masz mnie. nie piszę testów...

const NAGLOWKI =
  'Timestamp,Email Address,Link do zadania,Opcjonalne: kody,' +
  'Opcjonalne: omówienie (KaTeX wspierany),Opcjonalne: hinty/uwagi/linki/cokolwiek innego,' +
  'Co chcesz zrobić?,Wiadomość'

test.group('zbudujZgloszenia', () => {
  test('mapuje kolumny arkusza na pola zgłoszenia', ({ assert }) => {
    const csv = [
      NAGLOWKI,
      ',,,,,,,',
      '8/27/2026 12:48:51,adam.duda@post.com,,,,,Kontakt - inne,"wiadomość testowa, z przecinkiem"',
    ].join('\r\n')

    const zgloszenia = zbudujZgloszenia(csv)

    assert.lengthOf(zgloszenia, 1)
    assert.equal(zgloszenia[0].email, 'adam.duda@post.com')
    assert.equal(zgloszenia[0].rodzaj, 'Kontakt - inne')
    assert.equal(zgloszenia[0].wiadomosc, 'wiadomość testowa, z przecinkiem')
    assert.equal(zgloszenia[0].data?.toFormat('d.LL.yyyy HH:mm'), '27.08.2026 12:48')
  })

  test('pomija puste wiersze, które zostawia Google', ({ assert }) => {
    const csv = [NAGLOWKI, ',,,,,,,', ',,,,,,,'].join('\r\n')
    assert.lengthOf(zbudujZgloszenia(csv), 0)
  })

  test('układa najnowsze na górze, a wiersze bez daty na końcu', ({ assert }) => {
    const csv = [
      NAGLOWKI,
      '8/20/2026 10:00:00,stary@example.com,,,,,Kontakt - inne,stary',
      'bez daty,dziwny@example.com,,,,,Kontakt - inne,dziwny',
      '8/27/2026 12:48:51,nowy@example.com,,,,,Kontakt - inne,nowy',
    ].join('\r\n')

    assert.deepEqual(
      zbudujZgloszenia(csv).map((z) => z.wiadomosc),
      ['nowy', 'stary', 'dziwny']
    )
  })

  test('zachowuje wieloliniowe pola w cudzysłowach', ({ assert }) => {
    const csv = [
      NAGLOWKI,
      '8/27/2026 12:48:51,a@example.com,https://szkopul.edu.pl/c/x/p/sum/,' +
        '"int main() {\n  return 0;\n}",,,Zgłoś zadanie,treść',
    ].join('\r\n')

    const [z] = zbudujZgloszenia(csv)
    assert.equal(z.linkZadania, 'https://szkopul.edu.pl/c/x/p/sum/')
    assert.include(z.kody, 'return 0;')
    assert.equal(z.rodzaj, 'Zgłoś zadanie')
  })

  test('nieznane kolumny trafiają do dodatkowych, a puste znikają', ({ assert }) => {
    const csv = [
      NAGLOWKI + ',Nowe pytanie,Puste pytanie',
      '8/27/2026 12:48:51,a@example.com,,,,,Kontakt - inne,treść,odpowiedź,',
    ].join('\r\n')

    const [z] = zbudujZgloszenia(csv)
    assert.deepEqual(z.dodatkowe, [{ naglowek: 'Nowe pytanie', wartosc: 'odpowiedź' }])
  })
})

/** Pełny zestaw kolumn, łącznie z gałęziowymi pytaniami z dalszej części formularza. */
const NAGLOWKI_PELNE =
  'Timestamp,Email Address,Co chcesz zrobić?,Wiadomość,Link do zadania,Opcjonalne: kody,' +
  'Opcjonalne: omówienie (KaTeX wspierany),Opcjonalne: hinty/uwagi/linki/cokolwiek innego,' +
  'Chcę otrzymywać na podany w formularzu adres e-mail wiadomości dotyczące mojego zgłoszenia' +
  ' w tym powiadomienia o jego dodaniu,' +
  'Wiesz w jakim (lub w jakich) zakresie z powyższych mógłbyś pomóc? Możemy to ustalić później.'

function jedno(rodzaj: string, komorki: Partial<Record<string, string>> = {}) {
  const wiersz = [
    '8/27/2026 12:48:51',
    'a@example.com',
    rodzaj,
    komorki.wiadomosc ?? '',
    komorki.linkZadania ?? '',
    komorki.kody ?? '',
    komorki.omowienie ?? '',
    komorki.hinty ?? '',
    komorki.zgoda ?? '',
    komorki.zakresPomocy ?? '',
  ].join(',')
  return zbudujZgloszenia([NAGLOWKI_PELNE, wiersz].join('\r\n'))[0]
}

test.group('kolumny gałęziowe', () => {
  test('zgoda nie podbiera kolumny e-mail ani wiadomości', ({ assert }) => {
    const z = jedno('Propozycja nowego zadania', {
      wiadomosc: 'treść',
      zgoda: 'Tak',
    })

    assert.equal(z.email, 'a@example.com')
    assert.equal(z.wiadomosc, 'treść')
    assert.equal(z.zgoda, 'Tak')
  })

  test('pytanie o zakres pomocy trafia do własnego pola, nie do dodatkowych', ({ assert }) => {
    const z = jedno('Chcę pomóc!', { zakresPomocy: 'testowanie zadań' })

    assert.equal(z.zakresPomocy, 'testowanie zadań')
    assert.deepEqual(z.dodatkowe, [])
  })
})

test.group('kategoriaZgloszenia', () => {
  test('rozpoznaje wszystkie gałęzie formularza', ({ assert }) => {
    assert.equal(kategoriaZgloszenia('Propozycja nowego zadania'), 'noweZadanie')
    assert.equal(kategoriaZgloszenia('Chcę pomóc!'), 'pomoc')
    assert.equal(kategoriaZgloszenia('Zgłoszenie poprawki/błędu'), 'poprawka')
    assert.equal(kategoriaZgloszenia('Pytanie'), 'wiadomosc')
    assert.equal(kategoriaZgloszenia('Coś innego'), 'wiadomosc')
    assert.equal(kategoriaZgloszenia('Propozycja nowych treści/usprawnienia'), 'wiadomosc')
  })

  test('nieznana i pusta etykieta nie wysypują dopasowania', ({ assert }) => {
    assert.equal(kategoriaZgloszenia(''), 'nieznana')
    assert.equal(kategoriaZgloszenia('Zupełnie nowa opcja'), 'nieznana')
  })
})

test.group('ulozKarte', () => {
  test('propozycja zadania pokazuje pola zadania, a nie wiadomość', ({ assert }) => {
    const karta = ulozKarte(
      jedno('Propozycja nowego zadania', {
        linkZadania: 'https://szkopul.edu.pl/c/x/p/sum/',
        kody: 'int main() {}',
        zgoda: 'Tak',
      })
    )

    assert.deepEqual(
      karta.pola.map((p) => p.klucz),
      ['linkZadania', 'kody', 'zgoda']
    )
  })

  test('pytanie pokazuje samą wiadomość', ({ assert }) => {
    const karta = ulozKarte(jedno('Pytanie', { wiadomosc: 'jak działa dp?' }))

    assert.deepEqual(
      karta.pola.map((p) => p.klucz),
      ['wiadomosc']
    )
  })

  test('zgłoszenie poprawki pokazuje wszystko, bo to gałąź „wszystko inne”', ({ assert }) => {
    const karta = ulozKarte(
      jedno('Zgłoszenie poprawki/błędu', { wiadomosc: 'literówka', linkZadania: 'zadanie 5' })
    )

    assert.deepEqual(
      karta.pola.map((p) => p.klucz),
      ['wiadomosc', 'linkZadania']
    )
    assert.deepEqual(karta.pozostale, [])
  })

  test('odpowiedź spoza gałęzi nie znika, tylko ląduje w pozostałych', ({ assert }) => {
    const karta = ulozKarte(
      jedno('Pytanie', { wiadomosc: 'pytanie', kody: 'kod wpisany mimo innej gałęzi' })
    )

    assert.deepEqual(
      karta.pola.map((p) => p.klucz),
      ['wiadomosc']
    )
    assert.deepEqual(
      karta.pozostale.map((p) => p.klucz),
      ['kody']
    )
  })

  test('puste pola nie tworzą pustych wierszy na karcie', ({ assert }) => {
    const karta = ulozKarte(jedno('Propozycja nowego zadania', { linkZadania: 'https://x.test/' }))

    assert.deepEqual(
      karta.pola.map((p) => p.klucz),
      ['linkZadania']
    )
  })
})

test.group('mailtoOdpowiedz', () => {
  test('buduje odnośnik z tematem i zacytowanym zgłoszeniem', ({ assert }) => {
    const z = jedno('Pytanie', { wiadomosc: 'jak działa dp?' })
    const link = mailtoOdpowiedz(z)

    assert.isTrue(link.startsWith('mailto:a@example.com?'))
    assert.include(link, encodeURIComponent('Odp.: Pytanie'))
    assert.include(link, encodeURIComponent('> jak działa dp?'))
  })

  test('podpis admina trafia do stopki, a bez niego stopki nie ma', ({ assert }) => {
    const z = jedno('Pytanie', { wiadomosc: 'tresc' })

    const zPodpisem = decodeURIComponent(mailtoOdpowiedz(z, 'Adam Duda'))
    assert.include(zPodpisem, 'Pozdrawiam,\nAdam Duda')

    assert.notInclude(decodeURIComponent(mailtoOdpowiedz(z)), 'Pozdrawiam')
  })

  test('bez adresu e-mail nie ma czego budować', ({ assert }) => {
    const csv = [NAGLOWKI_PELNE, '8/27/2026 12:48:51,,Pytanie,treść,,,,,,'].join('\r\n')
    assert.equal(mailtoOdpowiedz(zbudujZgloszenia(csv)[0]), '')
  })
})
