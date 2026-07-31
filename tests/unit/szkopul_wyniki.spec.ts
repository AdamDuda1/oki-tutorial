import { test } from '@japa/runner'
import { parsujWynik, czyZrobione } from '#services/szkopul_wyniki'

// this is ai btw

test.group('parsujWynik', () => {
  test('nietknięte zadanie to brak wyniku, a nie zero punktów', ({ assert }) => {
    assert.isNull(parsujWynik({ score: '', status: null }))
  })

  test('brak user_result to brak wyniku', ({ assert }) => {
    assert.isNull(parsujWynik(undefined))
    assert.isNull(parsujWynik(null))
  })

  test('czyta score podany jako string z liczbą', ({ assert }) => {
    assert.deepEqual(parsujWynik({ score: '100', status: 'OK' }), { score: 100, status: 'OK' })
    assert.deepEqual(parsujWynik({ score: '50', status: 'WA' }), { score: 50, status: 'WA' })
  })

  test('zero punktów to prawdziwy wynik, nie brak wyniku', ({ assert }) => {
    assert.deepEqual(parsujWynik({ score: '0', status: 'WA' }), { score: 0, status: 'WA' })
  })

  test('sam status bez punktów nadal liczy się jako zgłoszenie', ({ assert }) => {
    assert.deepEqual(parsujWynik({ score: '', status: 'INI_OK' }), {
      score: null,
      status: 'INI_OK',
    })
  })

  test('czyZrobione tylko przy komplecie punktów', ({ assert }) => {
    assert.isTrue(czyZrobione({ score: 100, status: 'OK' }))
    assert.isFalse(czyZrobione({ score: 99, status: 'OK' }))
    assert.isFalse(czyZrobione({ score: null, status: 'INI_OK' }))
    assert.isFalse(czyZrobione(undefined))
  })
})
