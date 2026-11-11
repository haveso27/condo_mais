import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createTestServer } from './viteTestServer.js'
import { setToken } from '../src/services/api.js'
import { alterarStatusAreaComum, areaBody, areaNameTaken, areasService, salvarAreaComum } from '../src/services/areasComunsApi.js'
import { toArea } from '../src/services/reservasApi.js'

const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }
globalThis.window = new EventTarget()

test('formulário vira AreaComumDTO; aprovação só para área reservável', () => {
  assert.deepEqual(areaBody({ name: ' Salão ', description: ' ', rules: 'Até 23h', capacity: '80', bookable: true, requiresApproval: true }),
    { nome: 'Salão', descricao: null, regras: 'Até 23h', reservavel: true, exigeAprovacao: true, capacidade: 80, taxa: null, instrucoesPagamento: null, horarioAbertura: null, horarioFechamento: null })
  assert.deepEqual(areaBody({ name: 'Piscina', requiresApproval: true }),
    { nome: 'Piscina', descricao: null, regras: null, reservavel: false, exigeAprovacao: false, capacidade: null, taxa: null, instrucoesPagamento: null, horarioAbertura: null, horarioFechamento: null })
  assert.throws(() => areaBody({ name: ' ' }), (error) => error.status === 400)
  for (const capacity of ['0', '-3', '2.5', 'muitas']) assert.throws(() => areaBody({ name: 'X', capacity }), (error) => error.status === 400, capacity)
})

test('nome repetido (sem diferenciar maiúsculas) é barrado, exceto a própria área na edição', () => {
  const areas = [{ id: 'a', name: 'Salão de Festas' }, { id: 'b', name: 'Piscina' }]
  assert.equal(areaNameTaken(areas, ' salão de festas '), true)
  assert.equal(areaNameTaken(areas, 'Salão de Festas', 'a'), false)
  assert.equal(areaNameTaken(areas, 'Quadra'), false)
})

test('status da área para as abas e a etiqueta', () => {
  assert.equal(toArea({ id: 'a', nome: 'Quadra', ativo: false }).status, 'INATIVO')
  assert.equal(toArea({ id: 'b', nome: 'Salão', ativo: true }).status, 'ATIVO')
})

test('cadastrar, editar, ativar e desativar usam /condominios/areas-comuns', async () => {
  setToken('token')
  const calls = []
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({}), text: async () => '{}' } }
  await salvarAreaComum({ name: 'Quadra', bookable: true }, undefined, { fetchImpl })
  await salvarAreaComum({ name: 'Quadra', bookable: true }, 'ar-1', { fetchImpl })
  await alterarStatusAreaComum('ar-1', false, { fetchImpl })
  await alterarStatusAreaComum('ar-1', true, { fetchImpl })
  assert.deepEqual(calls.map((call) => [call.init.method, call.url.replace(/^.*\/condominios/, '')]), [
    ['POST', '/areas-comuns'], ['PUT', '/areas-comuns/ar-1'], ['PUT', '/areas-comuns/ar-1/desativar'], ['PUT', '/areas-comuns/ar-1/ativar'],
  ])
})

test('modo demonstração cria área ativa e sem aprovação quando não reservável', () => {
  const { record } = areasService.criar([{ id: 'ARE-1' }], { name: 'Quadra', bookable: false, requiresApproval: true })
  assert.equal(record.id, 'ARE-2')
  assert.equal(record.status, 'ATIVO')
  assert.equal(record.requiresApproval, false)
})

test('a tela de áreas comuns aparece no menu do admin e lista as áreas de demonstração', async () => {
  const server = await createTestServer()
  try {
    const { default: EntityPage } = await server.ssrLoadModule('/src/pages/desktop/EntityPage.jsx')
    const { AppDataProvider } = await server.ssrLoadModule('/src/context/AppDataContext.jsx')
    const html = renderToStaticMarkup(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(EntityPage, { role: 'admin', type: 'areasComuns' }))))
    assert.match(html, /href="\/admin\/areas-comuns"/)
    assert.match(html, /Áreas comuns/)
    assert.match(html, /Salão de Festas/)
    assert.match(html, /Nova área comum/)
  } finally {
    await server.close()
  }
})

test('taxa da área: vírgula ou ponto, vazia ou zero = gratuita, só para área reservável', () => {
  assert.deepEqual([areaBody({ name: 'Salão', bookable: true, feeValue: '150,50', paymentInstructions: ' Pix ' }).taxa, areaBody({ name: 'Salão', bookable: true, feeValue: '150,50', paymentInstructions: ' Pix ' }).instrucoesPagamento], [150.5, 'Pix'])
  assert.equal(areaBody({ name: 'Quadra', bookable: true, feeValue: '' }).taxa, null)
  assert.equal(areaBody({ name: 'Quadra', bookable: true, feeValue: '0' }).taxa, null)
  // Área que não é reservável não cobra nem guarda instruções
  assert.deepEqual([areaBody({ name: 'Hall', bookable: false, feeValue: '10', paymentInstructions: 'x' }).taxa, areaBody({ name: 'Hall', bookable: false, feeValue: '10', paymentInstructions: 'x' }).instrucoesPagamento], [null, null])
  assert.throws(() => areaBody({ name: 'Salão', bookable: true, feeValue: '-1' }), (error) => error.status === 400)
  assert.throws(() => areaBody({ name: 'Salão', bookable: true, feeValue: '10,555' }), (error) => error.status === 400)
})

test('funcionamento da área: os dois horários ou nenhum, e diferentes', () => {
  const body = areaBody({ name: 'Salão', bookable: true, openTime: '08:00', closeTime: '02:00' })
  assert.deepEqual([body.horarioAbertura, body.horarioFechamento], ['08:00', '02:00'])
  assert.deepEqual([areaBody({ name: 'Quadra' }).horarioAbertura, areaBody({ name: 'Quadra' }).horarioFechamento], [null, null])
  assert.throws(() => areaBody({ name: 'Salão', openTime: '08:00' }), (error) => error.status === 400)
  assert.throws(() => areaBody({ name: 'Salão', openTime: '08:00', closeTime: '08:00' }), (error) => /iguais/.test(error.message))
})
