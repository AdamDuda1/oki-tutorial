import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {
    await db.table('poziomy').multiInsert([
      { position: 1, nazwa: 'Programowanie OD PODSTAW', created_at: new Date(), updated_at: new Date() },
      { position: 2, nazwa: 'Olimpiada OD PODSTAW',    created_at: new Date(), updated_at: new Date() },
      { position: 3, nazwa: 'Olimpiada POZIOM II',     created_at: new Date(), updated_at: new Date() },
      { position: 4, nazwa: 'Olimpiada ZAAWANSOWANA',  created_at: new Date(), updated_at: new Date() },
    ])

    const [p1, p2, p3] = await db.from('poziomy').orderBy('position').select('id_poziomu')

    await db.table('tematy').multiInsert([
      // Programowanie OD PODSTAW
      {
        id_poziomu: p1.id_poziomu,
        position: 1,
        nazwa: 'Wstęp do programowania',
        krotki_opis: 'Podstawy składni, zmienne, typy danych.',
        link_yt: null,
        zewnetrzne_materialy: JSON.stringify(['https://oki.org.pl/wstep/']),
        zewnetrzne_materialy_opisy: JSON.stringify(['OKI – Wstęp ↗']),
        custom_html: null,
        zadania: JSON.stringify([218, 50]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id_poziomu: p1.id_poziomu,
        position: 2,
        nazwa: 'Pętle i warunki',
        krotki_opis: 'Instrukcje sterujące przepływem programu.',
        link_yt: null,
        zewnetrzne_materialy: JSON.stringify(['https://oki.org.pl/petle/']),
        zewnetrzne_materialy_opisy: JSON.stringify(['OKI – Pętle ↗']),
        custom_html: null,
        zadania: JSON.stringify([3, 16, 89]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Olimpiada OD PODSTAW
      {
        id_poziomu: p2.id_poziomu,
        position: 1,
        nazwa: 'Stos, Kolejka, Mapa',
        krotki_opis: 'Podstawowe struktury danych z biblioteki standardowej.',
        link_yt: 'https://www.youtube-nocookie.com/embed/Yvw7l18dH44?si=drw8WmKp0mgMgqr3&start=62',
        zewnetrzne_materialy: JSON.stringify([
          'https://oki.org.pl/stos-kolejka-mapa/',
          'https://codeforces.com/edu/course/2',
        ]),
        zewnetrzne_materialy_opisy: JSON.stringify([
          'OKI – materiały ↗',
          'Codeforces EDU ↗',
        ]),
        custom_html: null,
        zadania: JSON.stringify([6]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id_poziomu: p2.id_poziomu,
        position: 2,
        nazwa: 'Sumy prefiksowe',
        krotki_opis: 'Technika pozwalająca odpowiadać na zapytania o sumy przedziałów w O(1).',
        link_yt: 'https://www.youtube-nocookie.com/embed/Yvw7l18dH44?si=drw8WmKp0mgMgqr3&start=62',
        zewnetrzne_materialy: JSON.stringify([
          'https://oki.org.pl/sumy-prefiksowe/',
          'https://oki.org.pl/breed-counting/',
        ]),
        zewnetrzne_materialy_opisy: JSON.stringify([
          'OKI p1 2025/26 ↗',
          'Omówienie Breed Counting ↗',
        ]),
        custom_html: '<p>Suma prefiksowa tablicy <code>a[]</code> to tablica <code>p[]</code> gdzie <code>p[i] = a[0] + ... + a[i]</code>.</p>',
        zadania: JSON.stringify([84, 7, 10]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id_poziomu: p2.id_poziomu,
        position: 3,
        nazwa: 'Binary search',
        krotki_opis: 'Wyszukiwanie binarne na odpowiedzi i na tablicy.',
        link_yt: null,
        zewnetrzne_materialy: JSON.stringify([
          'https://oki.org.pl/binary-search/',
          'https://codeforces.com/edu/course/2/lesson/6',
        ]),
        zewnetrzne_materialy_opisy: JSON.stringify([
          'OKI – omówienie ↗',
          'Codeforces EDU – Binary Search ↗',
        ]),
        custom_html: null,
        zadania: JSON.stringify([29, 128]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id_poziomu: p2.id_poziomu,
        position: 4,
        nazwa: 'Algorytm Euklidesa',
        krotki_opis: 'NWD, NWW i ich zastosowania.',
        link_yt: null,
        zewnetrzne_materialy: JSON.stringify(['https://oki.org.pl/algorytm-euklidesa/']),
        zewnetrzne_materialy_opisy: JSON.stringify(['OKI – materiały ↗']),
        custom_html: null,
        zadania: JSON.stringify([1, 136]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Olimpiada POZIOM II
      {
        id_poziomu: p3.id_poziomu,
        position: 1,
        nazwa: 'Programowanie dynamiczne',
        krotki_opis: 'Rozwiązywanie problemów przez rozbicie na podproblemy.',
        link_yt: null,
        zewnetrzne_materialy: JSON.stringify(['https://oki.org.pl/dp/']),
        zewnetrzne_materialy_opisy: JSON.stringify(['OKI – materiały ↗']),
        custom_html: null,
        zadania: JSON.stringify([51, 44, 45]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id_poziomu: p3.id_poziomu,
        position: 2,
        nazwa: 'Grafy – przeszukiwanie',
        krotki_opis: 'BFS, DFS i ich zastosowania.',
        link_yt: null,
        zewnetrzne_materialy: JSON.stringify(['https://oki.org.pl/grafy/']),
        zewnetrzne_materialy_opisy: JSON.stringify(['OKI – materiały ↗']),
        custom_html: null,
        zadania: JSON.stringify([46, 57, 147]),
        published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
  }
}
