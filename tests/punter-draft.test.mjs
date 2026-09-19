import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyCarryOver, initialPunterDraft, punterDraftReducer, stakeValues } from '../src/lib/punter-draft.ts'

test('análise preserva edições manuais, incluindo campos apagados pelo usuário', () => {
  let state = initialPunterDraft()
  state = punterDraftReducer(state, { type: 'edit', values: { event: 'Manual', notes: 'Minha nota', selection: '' } })
  state = punterDraftReducer(state, { type: 'import', values: { event: 'IA', selection: 'IA', odd: '1.95' } })
  assert.equal(state.fields.event, 'Manual')
  assert.equal(state.fields.notes, 'Minha nota')
  assert.equal(state.fields.selection, '')
  assert.equal(state.fields.odd, '1.95')
})

test('desfazer restaura importados sem apagar correções posteriores', () => {
  let state = initialPunterDraft()
  state = punterDraftReducer(state, { type: 'import', values: { odd: '2', amount: '100', amountMode: 'money' } })
  state = punterDraftReducer(state, { type: 'edit', values: { odd: '2.5' } })
  state = punterDraftReducer(state, { type: 'undo' })
  assert.equal(state.fields.odd, '2.5')
  assert.equal(state.fields.amount, '1')
  assert.equal(state.fields.amountMode, 'units')
})

test('importação não troca modo de valor editado manualmente', () => {
  let state = initialPunterDraft()
  state = punterDraftReducer(state, { type: 'edit', values: { amount: '2' } })
  state = punterDraftReducer(state, { type: 'import', values: { amount: '100', amountMode: 'money' } })
  assert.equal(state.fields.amountMode, 'units')
  assert.equal(state.fields.amount, '2')
})

test('desfazer depois de corrigir dinheiro preserva o valor e sua moeda', () => {
  let state = initialPunterDraft()
  state = punterDraftReducer(state, { type: 'import', values: { amount: '100', amountMode: 'money', odd: '2' } })
  state = punterDraftReducer(state, { type: 'edit', values: { amount: '120' } })
  state = punterDraftReducer(state, { type: 'undo' })
  assert.equal(state.fields.amount, '120')
  assert.equal(state.fields.amountMode, 'money')
  assert.equal(stakeValues(state.fields.amount, state.fields.amountMode, 30).stake, 120)
})

test('R$ 100 com unidade de R$ 30 permanece R$ 100 ao alternar modos', () => {
  const money = stakeValues('100', 'money', 30)
  assert.equal(money.stake, 100)
  const units = stakeValues(String(money.units), 'units', 30)
  assert.equal(units.stake, 100)
  assert.equal(stakeValues('100,50', 'money', 30).stake, 100.50)
})

test('rejeita valores não finitos ou unidade inválida', () => {
  for (const amount of ['Infinity', '-10', 'NaN', '']) assert.equal(stakeValues(amount, 'money', 30).stake, 0)
  assert.equal(stakeValues('100', 'money', 0).units, 0)
})

test('conta, tipster e data da aposta seguem para a próxima aposta', () => {
  const carryOver = { bookmakerAccountId: '7', tipsterId: '3', placedAt: '2026-09-19T10:30' }
  const state = initialPunterDraft(carryOver)
  assert.equal(state.fields.bookmakerAccountId, '7')
  assert.equal(state.fields.tipsterId, '3')
  assert.equal(state.fields.placedAt, '2026-09-19T10:30')
  // o resto do formulário continua limpo
  assert.equal(state.fields.event, '')
  assert.equal(state.fields.selection, '')
  assert.equal(state.fields.odd, '')
  assert.equal(state.fields.notes, '')
  assert.deepEqual(state.touched, {})
})

test('sem carry-over a data da aposta volta a ser agora e os campos ficam vazios', () => {
  for (const state of [initialPunterDraft(), initialPunterDraft(emptyCarryOver)]) {
    assert.equal(state.fields.bookmakerAccountId, '')
    assert.equal(state.fields.tipsterId, '')
    assert.match(state.fields.placedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  }
})
