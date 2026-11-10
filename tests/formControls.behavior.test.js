import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { createTestServer } from './viteTestServer.js'
import { MAX_TOWERS, createInitialWizardState, suggestTowerName, wizardReducer } from '../src/features/setupWizard/verticalSetup.js'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Event = dom.window.Event

const { cleanup, fireEvent, render } = await import('@testing-library/react')
const server = await createTestServer()
const { default: NumberStepper } = await server.ssrLoadModule('/src/components/NumberStepper.jsx')
const { default: TimeSelect, timeOptions } = await server.ssrLoadModule('/src/components/TimeSelect.jsx')
const { entityConfigs } = await server.ssrLoadModule('/src/config/entityConfigs.js')
const { default: DynamicForm } = await server.ssrLoadModule('/src/components/DynamicForm.jsx')

test.afterEach(() => cleanup())
test.after(async () => { await server.close(); dom.window.close() })

// ---------------------------------------------------------------------------
// Sugestões e duplicação de torres (CONDO-06 e CONDO-15)
// ---------------------------------------------------------------------------

test('sugere Torre A, B, C… sem repetir nomes e continua o padrão numérico', () => {
  assert.equal(suggestTowerName([]), 'Torre A')
  assert.equal(suggestTowerName([{ name: 'Torre A' }, { name: ' torre b ' }]), 'Torre C')
  assert.equal(suggestTowerName([{ name: 'Torre A' }, { name: 'Torre C' }]), 'Torre B')
  assert.equal(suggestTowerName([{ name: 'Torre 1' }, { name: 'Torre 2' }]), 'Torre 3')
})

test('a torre inicial e as adicionadas já vêm com nome sugerido e editável', () => {
  let state = createInitialWizardState()
  assert.equal(state.draft.towers[0].name, 'Torre A')
  state = wizardReducer(state, { type: 'ADD_TOWER' })
  assert.deepEqual(state.draft.towers.map((tower) => tower.name), ['Torre A', 'Torre B'])
})

test('duplicar copia só a configuração: identidade e nome próprios, original intacto', () => {
  let state = createInitialWizardState()
  state = wizardReducer(state, { type: 'UPDATE_TOWER', id: 'tower-1', field: 'floorCount', value: '12' })
  state = wizardReducer(state, { type: 'UPDATE_TOWER', id: 'tower-1', field: 'separator', value: '-' })
  state = wizardReducer(state, { type: 'DUPLICATE_TOWER', id: 'tower-1' })
  const [original, copy] = state.draft.towers
  assert.notEqual(copy.id, original.id)
  assert.equal(copy.name, 'Torre B')
  assert.equal(copy.floorCount, '12')
  assert.equal(copy.separator, '-')
  state = wizardReducer(state, { type: 'UPDATE_TOWER', id: copy.id, field: 'floorCount', value: '3' })
  assert.equal(state.draft.towers[0].floorCount, '12')
  assert.equal(state.draft.towers[1].floorCount, '3')
  assert.equal(wizardReducer(state, { type: 'DUPLICATE_TOWER', id: 'inexistente' }), state)
})

test('quantidade de torres adiciona com sugestões e remove pelo fim, dentro do limite', () => {
  let state = createInitialWizardState()
  state = wizardReducer(state, { type: 'SET_TOWER_COUNT', count: '3' })
  assert.deepEqual(state.draft.towers.map((tower) => tower.name), ['Torre A', 'Torre B', 'Torre C'])
  state = wizardReducer(state, { type: 'SET_TOWER_COUNT', count: 1 })
  assert.deepEqual(state.draft.towers.map((tower) => tower.name), ['Torre A'])
  state = wizardReducer(state, { type: 'SET_TOWER_COUNT', count: 999 })
  assert.equal(state.draft.towers.length, MAX_TOWERS)
  assert.equal(new Set(state.draft.towers.map((tower) => tower.id)).size, MAX_TOWERS)
})

// ---------------------------------------------------------------------------
// Componentes de formulário
// ---------------------------------------------------------------------------

function Harness({ initial = '3', ...props }) {
  const [value, setValue] = React.useState(initial)
  return React.createElement(React.Fragment, null,
    React.createElement('label', { htmlFor: 'n' }, 'Andares'),
    React.createElement(NumberStepper, { id: 'n', value, onChange: setValue, ...props }),
    React.createElement('output', null, value))
}

test('controle numérico incrementa e decrementa e respeita os limites sem bloquear digitação', () => {
  const view = render(React.createElement(Harness, { min: 1, max: 5, label: 'andares' }))
  fireEvent.click(view.getByRole('button', { name: 'Aumentar andares' }))
  assert.equal(view.getByLabelText('Andares').value, '4')
  fireEvent.click(view.getByRole('button', { name: 'Aumentar andares' }))
  assert.equal(view.getByRole('button', { name: 'Aumentar andares' }).disabled, true)
  fireEvent.change(view.getByLabelText('Andares'), { target: { value: '1' } })
  assert.equal(view.getByRole('button', { name: 'Diminuir andares' }).disabled, true)
  fireEvent.change(view.getByLabelText('Andares'), { target: { value: '' } })
  fireEvent.click(view.getByRole('button', { name: 'Aumentar andares' }))
  assert.equal(view.getByLabelText('Andares').value, '1')
})

test('seletor de horário lista 15 em 15 minutos e preserva horário legítimo fora do passo', () => {
  const options = timeOptions()
  assert.equal(options.length, 96)
  assert.equal(options[0], '00:00')
  assert.ok(options.includes('23:45'))
  const changes = []
  const view = render(React.createElement(TimeSelect, { 'aria-label': 'Início', value: '08:07', onChange: (value) => changes.push(value) }))
  const select = view.getByLabelText('Início')
  assert.equal(select.value, '08:07')
  fireEvent.change(select, { target: { value: '22:30' } })
  assert.deepEqual(changes, ['22:30'])
})

test('DynamicForm oferece lista pesquisável, seletor de horário e controle numérico', () => {
  const values = {}
  const fields = [
    { key: 'unit', label: 'Apartamento', type: 'search', options: ['101', '102', '201'], required: true },
    { key: 'startTime', label: 'Horário inicial', type: 'timeselect' },
    { key: 'floors', label: 'Andares', type: 'stepper', min: 1, max: 9 },
  ]
  const changes = []
  const view = render(React.createElement(DynamicForm, { fields, values, onChange: (key, value) => changes.push([key, value]) }))
  const unit = view.getByLabelText(/Apartamento/)
  assert.ok(unit.getAttribute('list'))
  assert.deepEqual([...document.getElementById(unit.getAttribute('list')).querySelectorAll('option')].map((option) => option.value), ['101', '102', '201'])
  fireEvent.change(unit, { target: { value: '102' } })
  fireEvent.change(view.getByLabelText('Horário inicial'), { target: { value: '19:00' } })
  fireEvent.click(view.getByRole('button', { name: 'Aumentar Andares' }))
  assert.deepEqual(changes, [['unit', '102'], ['startTime', '19:00'], ['floors', '1']])
})

// ---------------------------------------------------------------------------
// Perfis (CONDO-09 / CONDO-12): a Portaria não tem acesso geral a ocorrências
// ---------------------------------------------------------------------------

test('a Portaria não possui tela de chamados', () => {
  assert.equal(entityConfigs.chamadosPortaria, undefined)
  assert.ok(entityConfigs.chamadosAdmin)
})

// Regressão: o diálogo do Wizard fica dentro do <form>; seus botões não podem enviar o formulário
test('botões do Modal não enviam o formulário que o contém', async () => {
  const { default: Modal } = await server.ssrLoadModule('/src/components/Modal.jsx')
  let submitted = 0
  const view = render(React.createElement('form', { onSubmit: (event) => { event.preventDefault(); submitted += 1 } },
    React.createElement(Modal, { open: true, title: 'Descartar', onClose() {}, onConfirm() {}, confirmLabel: 'Descartar' })))
  for (const name of ['Descartar', 'Cancelar', 'Fechar']) fireEvent.click(view.getAllByRole('button', { name })[0])
  assert.equal(submitted, 0)
})
