import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createTestServer } from './viteTestServer.js'
import { buildSetupPayload, createInitialSetupDraft, createTower } from '../src/features/setupWizard/verticalSetup.js'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Event = dom.window.Event
globalThis.sessionStorage = dom.window.sessionStorage
window.scrollTo = () => {}

const { act, cleanup, fireEvent, render, waitFor } = await import('@testing-library/react')
const server = await createTestServer()
const { default: VerticalSetupWizardExperience } = await server.ssrLoadModule('/src/pages/desktop/VerticalSetupWizardExperience.jsx')
const { ApiError, setToken } = await server.ssrLoadModule('/src/services/api.js')
const { salvarConfiguracaoInicial } = await server.ssrLoadModule('/src/services/setupApi.js')

test.afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

test.after(async () => {
  await server.close()
  dom.window.close()
})

// ---------------------------------------------------------------------------
// Corpo enviado ao backend (contrato de POST /condominios/configuracao-inicial)
// ---------------------------------------------------------------------------

test('monta o corpo com os parâmetros das torres, sem o nome do condomínio', () => {
  const draft = createInitialSetupDraft()
  draft.condominium = { name: 'Residencial Teste', address: ' Rua das Flores, 100 ', city: 'Recife', state: 'PE' }
  draft.towers = [{ ...createTower('tower-1'), name: ' Torre A ', floorCount: '10', unitsPerFloor: '4', firstFloor: '1', firstUnit: '1', unitDigits: '2', separator: '' },
    { ...createTower('tower-2'), name: 'Torre B', floorCount: '2', unitsPerFloor: '3', firstFloor: '5', firstUnit: '3', unitDigits: '3', separator: '-' }]
  draft.commonAreas = ['Piscina']
  draft.customAreas = [{ id: 'custom-1', name: 'Espaço de convivência', reservable: true }]

  assert.deepEqual(buildSetupPayload(draft), {
    modelo: 'VERTICAL',
    endereco: 'Rua das Flores, 100',
    cidade: 'Recife',
    estado: 'PE',
    torres: [
      { nome: 'Torre A', andares: 10, unidadesPorAndar: 4, andarInicial: 1, sequenciaInicial: 1, digitos: 2, separador: '', terreo: 'SEM_APARTAMENTOS' },
      { nome: 'Torre B', andares: 2, unidadesPorAndar: 3, andarInicial: 5, sequenciaInicial: 3, digitos: 3, separador: '-', terreo: 'SEM_APARTAMENTOS' },
    ],
    areasComuns: [
      { nome: 'Piscina', descricao: null, reservavel: false, exigeAprovacao: false, capacidade: null },
      { nome: 'Espaço de convivência', descricao: null, reservavel: true, exigeAprovacao: false, capacidade: null },
    ],
  })
})

test('o serviço envia POST para a rota da configuração e exige 201', async () => {
  setToken('token-admin')
  const calls = []
  const responder = (status) => async (url, init) => {
    calls.push({ url, init })
    return { ok: status < 400, status, json: async () => ({}), text: async () => JSON.stringify({ configuracaoInicial: 'CONCLUIDA' }) }
  }

  const resposta = await salvarConfiguracaoInicial({ modelo: 'VERTICAL' }, { fetchImpl: responder(201) })
  assert.equal(resposta.configuracaoInicial, 'CONCLUIDA')
  assert.match(calls[0].url, /\/condominios\/configuracao-inicial$/)
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-admin')
  assert.deepEqual(JSON.parse(calls[0].init.body), { modelo: 'VERTICAL' })

  await assert.rejects(salvarConfiguracaoInicial({}, { fetchImpl: responder(200) }), (error) => error.status === 502)
})

// ---------------------------------------------------------------------------
// Tela: do primeiro passo ao envio
// ---------------------------------------------------------------------------

function renderWizard({ saveSetup, reloadSession = async () => {}, loadCurrentUser = async () => ({ perfil: 'ADMIN', configuracaoInicial: 'PENDENTE', condominioNome: 'Residencial Teste' }) }) {
  return render(React.createElement(MemoryRouter, { initialEntries: ['/admin/configuracao-inicial'] },
    React.createElement(Routes, null,
      React.createElement(Route, { path: '/admin/configuracao-inicial', element: React.createElement(VerticalSetupWizardExperience, { saveSetup, loadCurrentUser, reloadSession }) }),
      React.createElement(Route, { path: '/admin', element: React.createElement('p', null, 'Painel do administrador') }),
    )))
}

async function preencherAteOResumo(view, { terreo } = {}) {
  await waitFor(() => assert.equal(view.getByLabelText('Nome do condomínio').value, 'Residencial Teste'))
  const continuar = () => fireEvent.click(view.getByRole('button', { name: /Continuar/ }))
  fireEvent.change(view.getByLabelText('Endereço'), { target: { value: 'Rua das Flores, 100' } })
  fireEvent.change(view.getByLabelText('Cidade'), { target: { value: 'Recife' } })
  fireEvent.change(view.getByLabelText('Estado'), { target: { value: 'PE' } })
  continuar() // dados -> modelo
  continuar() // modelo -> torres
  fireEvent.change(view.getByLabelText('Nome da torre'), { target: { value: 'Torre A' } })
  if (terreo) {
    fireEvent.change(view.getByLabelText('Térreo'), { target: { value: terreo } })
    // Com apartamentos no térreo, o primeiro andar passa a ser o primeiro acima dele
    assert.ok(view.getByLabelText(terreo === 'COM_APARTAMENTOS' ? 'Primeiro andar acima do térreo' : 'Primeiro andar'))
  }
  continuar() // torres -> prévia
  continuar() // prévia -> áreas
  fireEvent.click(view.getByLabelText('Piscina'))
  continuar() // áreas -> resumo
  return view.getByRole('button', { name: /Concluir configuração/ })
}

test('térreo com apartamentos escolhido na lista vai no envio', async () => {
  const enviados = []
  const view = renderWizard({ saveSetup: async (payload) => { enviados.push(payload); return { configuracaoInicial: 'CONCLUIDA' } } })

  fireEvent.click(await preencherAteOResumo(view, { terreo: 'COM_APARTAMENTOS' }))

  await waitFor(() => assert.equal(enviados.length, 1))
  assert.equal(enviados[0].torres[0].terreo, 'COM_APARTAMENTOS')
})

test('nome do condomínio vem do cadastro do MASTER e fica só para leitura', async () => {
  const view = renderWizard({ saveSetup: async () => ({}) })

  await waitFor(() => assert.equal(view.getByLabelText('Nome do condomínio').value, 'Residencial Teste'))
  assert.equal(view.getByLabelText('Nome do condomínio').readOnly, true)
})

test('sem o nome da sessão, o campo continua editável', async () => {
  const view = renderWizard({ saveSetup: async () => ({}), loadCurrentUser: async () => { throw new ApiError(500, 'falhou') } })

  await act(async () => {})
  assert.equal(view.getByLabelText('Nome do condomínio').readOnly, false)
})

test('concluir envia a configuração uma vez e leva ao painel', async () => {
  const enviados = []
  let liberar
  const saveSetup = (payload) => { enviados.push(payload); return new Promise((resolve) => { liberar = resolve }) }
  const view = renderWizard({ saveSetup })

  const concluir = await preencherAteOResumo(view)
  fireEvent.click(concluir)
  fireEvent.click(view.getByRole('button', { name: /Salvando configuração/ })) // duplo clique enquanto envia

  assert.equal(enviados.length, 1)
  assert.equal(enviados[0].estado, 'PE')
  assert.deepEqual(enviados[0].torres.map((torre) => torre.nome), ['Torre A'])
  assert.deepEqual(enviados[0].areasComuns.map((area) => area.nome), ['Piscina'])
  assert.equal('nome' in enviados[0], false)

  await act(async () => liberar({ configuracaoInicial: 'CONCLUIDA' }))
  await waitFor(() => assert.ok(view.getByText('Painel do administrador')))
})

test('409 (já concluída) também leva ao painel', async () => {
  const view = renderWizard({ saveSetup: async () => { throw new ApiError(409, 'A configuração inicial deste condomínio já foi concluída.') } })

  fireEvent.click(await preencherAteOResumo(view))

  await waitFor(() => assert.ok(view.getByText('Painel do administrador')))
})

test('erro do backend aparece no resumo e permite tentar de novo', async () => {
  let tentativas = 0
  const view = renderWizard({ saveSetup: async () => { tentativas += 1; throw new ApiError(400, 'A numeração da torre "Torre A" gera a unidade "111" mais de uma vez.') } })

  fireEvent.click(await preencherAteOResumo(view))

  await waitFor(() => assert.ok(view.getByText(/gera a unidade "111" mais de uma vez/)))
  assert.equal(view.queryByText('Painel do administrador'), null)
  const deNovo = view.getByRole('button', { name: /Concluir configuração/ })
  assert.equal(deNovo.disabled, false)
  fireEvent.click(deNovo)
  await waitFor(() => assert.equal(tentativas, 2))
})

// ---------------------------------------------------------------------------
// Depois de gravar, a sessão é recarregada: ela foi aberta com o condomínio PENDENTE,
// quando torres e unidades não são carregadas, e o painel abriria vazio até um F5
// ---------------------------------------------------------------------------

test('recarrega a sessão antes de abrir o painel', async () => {
  const ordem = []
  const view = renderWizard({
    saveSetup: async () => { ordem.push('salvou') },
    reloadSession: async () => { ordem.push('recarregou') },
  })

  fireEvent.click(await preencherAteOResumo(view))

  await waitFor(() => assert.ok(view.getByText('Painel do administrador')))
  assert.deepEqual(ordem, ['salvou', 'recarregou'])
})

test('no 409 também recarrega a sessão', async () => {
  let recargas = 0
  const view = renderWizard({
    saveSetup: async () => { throw new ApiError(409, 'Já concluída.') },
    reloadSession: async () => { recargas += 1 },
  })

  fireEvent.click(await preencherAteOResumo(view))

  await waitFor(() => assert.ok(view.getByText('Painel do administrador')))
  assert.equal(recargas, 1)
})

test('erro ao salvar não recarrega a sessão', async () => {
  let recargas = 0
  const view = renderWizard({
    saveSetup: async () => { throw new ApiError(400, 'Dados inválidos.') },
    reloadSession: async () => { recargas += 1 },
  })

  fireEvent.click(await preencherAteOResumo(view))

  await waitFor(() => assert.ok(view.getByText('Dados inválidos.')))
  assert.equal(recargas, 0)
})

test('falha ao recarregar não prende o admin no wizard', async () => {
  const view = renderWizard({
    saveSetup: async () => ({}),
    reloadSession: async () => { throw new Error('rede caiu') },
  })

  fireEvent.click(await preencherAteOResumo(view))

  await waitFor(() => assert.ok(view.getByText('Painel do administrador')))
})
