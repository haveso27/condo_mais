import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { createTestServer } from './viteTestServer.js'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Event = dom.window.Event
globalThis.sessionStorage = dom.window.sessionStorage
// O jsdom não implementa rolagem; o formulário rola até o campo com erro
dom.window.HTMLElement.prototype.scrollIntoView = () => {}

// Liga o modo API só neste servidor de testes (Vite expõe variáveis VITE_ do ambiente)
process.env.VITE_API_URL = 'http://api.test'
const server = await createTestServer()
delete process.env.VITE_API_URL
const { act, cleanup, render, waitFor } = await import('@testing-library/react')
const { AppDataProvider, useAppData } = await server.ssrLoadModule('/src/context/AppDataContext.jsx')

const jwt = (claims) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.assinatura`
}

const encomenda = (id, status, codigo) => ({
  id, codigoIdentificacao: codigo, status, observacao: null, dataHoraRecebimento: '2026-10-27T10:00:00',
  apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', moradorNome: 'Carla', porteiroRecebimentoNome: 'João',
})

// API falsa: o que cada rota responde e o que foi chamado
const reserva = (id, status, extra = {}) => ({
  id, areaId: 'ar-salao', areaNome: 'Salão de Festas', dataReserva: '2099-12-20', horarioInicio: '18:00:00', horarioFim: '22:00:00',
  status, moradorNome: 'Carla', apartamentoNumero: '101', torreNome: 'Torre A', aprovadorNome: null, ...extra,
})

const chamado = (id, status, extra = {}) => ({
  id, titulo: 'Vazamento na garagem', descricao: 'Perto da vaga 12', prioridade: 'ALTA', status, categoriaId: 'cat-outros', categoriaNome: 'Outros',
  apartamentoId: null, apartamentoNumero: null, torreNome: null, solicitanteNome: 'Carla', imagemUrl: null, responsavelExterno: null, contatoExterno: null,
  dataPrevisaoAtendimento: null, dataAbertura: '2026-10-27T09:00:00', dataEncerramento: null, historico: null, ...extra,
})

const visita = (id, status, extra = {}) => ({
  id, status, origem: 'PORTARIA', visitanteNome: 'Mariana Souza', visitanteCpf: '529.982.247-25', visitanteTelefone: null,
  apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', moradorNome: 'Carla',
  dataInicio: '2026-10-27', horaInicio: '08:00:00', dataFim: '2099-12-31', horaFim: '23:00:00', observacao: null,
  dataHoraRegistro: '2026-10-27T08:00:00', dataHoraEntrada: null, dataHoraSaida: null, porteiroEntradaNome: null, porteiroSaidaNome: null, ...extra,
})

function fakeApi({ packages = [], packagesStatus = 200, me = { id: 'u-1', nome: 'João', perfil: 'PORTARIA', condominioNome: 'Residencial' }, reservations = [], tickets = [], visits = [] } = {}) {
  const calls = []
  let visitList = [...visits]
  let areaList = [
    { id: 'ar-salao', nome: 'Salão de Festas', reservavel: true, exigeAprovacao: true, ativo: true },
    { id: 'ar-piscina', nome: 'Piscina', reservavel: false, exigeAprovacao: false, ativo: true },
    { id: 'ar-quadra', nome: 'Quadra', reservavel: true, exigeAprovacao: false, ativo: false },
  ]
  let list = [...packages]
  let bookings = [...reservations]
  let ticketList = [...tickets]
  const history = { 'c-1': [{ acao: 'ABERTURA', comentario: 'Chamado aberto no sistema.', dataHora: '2026-10-27T09:00:00', usuarioNome: 'Carla' }] }
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname
    const method = init.method || 'GET'
    calls.push({ method, path, query: Object.fromEntries(new URL(url).searchParams), body: init.body ? JSON.parse(init.body) : undefined })
    const reply = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => (body === undefined ? '' : JSON.stringify(body)) })
    if (path === '/usuarios/me') return reply(200, me)
    if (path === '/portaria/visitas' && method === 'GET') return reply(200, visitList)
    if (path === '/portaria/visitas' && method === 'POST') {
      const body = JSON.parse(init.body)
      visitList = [visita('v-new', body.autorizado === false ? 'PENDENTE' : 'AUTORIZADO', { visitanteNome: body.nome, origem: body.apartamentoId ? 'PORTARIA' : 'MORADOR' }), ...visitList]
      return reply(200, visitList[0])
    }
    const visitMatch = path.match(/^\/portaria\/visitas\/([^/]+)\/(autorizar|recusar|entrada|saida)$/)
    if (visitMatch && method === 'PUT') {
      const [, id, action] = visitMatch
      const status = { autorizar: 'AUTORIZADO', recusar: 'RECUSADO', entrada: 'ENTROU', saida: 'SAIU' }[action]
      visitList = visitList.map((item) => item.id === id ? { ...item, status, ...(status === 'ENTROU' ? { dataHoraEntrada: '2026-10-27T10:00:00', porteiroEntradaNome: 'João' } : {}) } : item)
      return reply(200, visitList.find((item) => item.id === id))
    }
    if (path === '/atendimento/categorias') return reply(200, [{ id: 'cat-eletrica', nome: 'Elétrica' }, { id: 'cat-outros', nome: 'Outros' }])
    if (path === '/atendimento/chamados' && method === 'GET') return reply(200, ticketList)
    if (path === '/atendimento/chamados' && method === 'POST') { ticketList = [chamado('c-new', 'ABERTO'), ...ticketList]; return reply(200, ticketList[0]) }
    const ticketMatch = path.match(/^\/atendimento\/chamados\/([^/]+)(\/comentarios)?$/)
    if (ticketMatch) {
      const [, id, isComment] = ticketMatch
      const body = init.body ? JSON.parse(init.body) : {}
      if (method === 'PUT') {
        ticketList = ticketList.map((item) => item.id === id ? { ...item, ...(body.status ? { status: body.status.replace('_', ' ') } : {}), ...(body.categoriaId ? { categoriaId: body.categoriaId, categoriaNome: 'Elétrica' } : {}) } : item)
        history[id] = [...(history[id] || []), { acao: body.status ? `STATUS: -> ${body.status}` : 'CATEGORIA: Outros -> Elétrica', comentario: body.comentario, dataHora: '2026-10-27T10:00:00', usuarioNome: 'Admin' }]
      }
      if (isComment) history[id] = [...(history[id] || []), { acao: 'COMENTARIO', comentario: body.comentario, dataHora: '2026-10-27T11:00:00', usuarioNome: me.nome }]
      return reply(200, { ...ticketList.find((item) => item.id === id), historico: history[id] || [] })
    }
    if (path === '/condominios/areas-comuns' && method === 'GET') return reply(200, areaList)
    if (path === '/condominios/areas-comuns' && method === 'POST') { const body = JSON.parse(init.body); areaList = [...areaList, { id: 'ar-new', ...body, ativo: true }]; return reply(200, areaList.at(-1)) }
    const areaMatch = path.match(/^\/condominios\/areas-comuns\/([^/]+)(\/(ativar|desativar))?$/)
    if (areaMatch && method === 'PUT') {
      const [, id, , toggle] = areaMatch
      const patch = toggle ? { ativo: toggle === 'ativar' } : JSON.parse(init.body)
      areaList = areaList.map((area) => area.id === id ? { ...area, ...patch } : area)
      return reply(200, areaList.find((area) => area.id === id))
    }
    if (path === '/interativo/reservas/ocupacao') return reply(200, [{ horarioInicio: '18:00:00', horarioFim: '22:00:00', status: 'CONFIRMADA' }])
    if (path === '/interativo/reservas' && method === 'GET') return reply(200, bookings)
    if (path === '/interativo/reservas' && method === 'POST') { bookings = [reserva('r-new', 'AGUARDANDO APROVACAO'), ...bookings]; return reply(200, bookings[0]) }
    if (/^\/interativo\/reservas\/[^/]+\/(aprovar|recusar|cancelar)$/.test(path)) {
      const [, , , id, action] = path.split('/')
      const status = { aprovar: 'CONFIRMADA', recusar: 'RECUSADA', cancelar: 'CANCELADA' }[action]
      bookings = bookings.map((item) => item.id === id ? { ...item, status } : item)
      return reply(200, bookings.find((item) => item.id === id))
    }
    if (path === '/condominios/torres') return reply(200, [{ id: 't-a', nome: 'Torre A' }])
    if (path === '/condominios/apartamentos') return reply(200, [{ id: 'a-101', numero: '101', torreId: 't-a', status: 'OCUPADO' }])
    if (path === '/usuarios') return reply(403, {})
    if (path === '/interativo/avisos' && method === 'GET') return reply(200, [{ id: 'av-1', titulo: 'Falta de água', conteudo: 'Bomba', prioridade: 'URGENTE', dataValidade: null, ativo: true, criadoEm: '2026-10-27T09:00:00', autorNome: 'Admin', torreId: null, torreNome: null }])
    if (path === '/interativo/avisos' && method === 'POST') return reply(200, {})
    if (path === '/interativo/avisos/av-1' && method === 'DELETE') return reply(200, undefined)
    if (path === '/portaria/encomendas' && method === 'GET') return packagesStatus === 200 ? reply(200, list) : reply(packagesStatus, { mensagem: 'Falha nas encomendas' })
    if (path === '/portaria/encomendas/recebimento') { list = [encomenda('e-new', 'AGUARDANDO RETIRADA', 'NOVA1'), ...list]; return reply(200, list[0]) }
    if (path.endsWith('/retirada')) { list = list.map((item) => item.id === 'e-1' ? { ...item, status: 'RETIRADA' } : item); return reply(200, list[0]) }
    return reply(404, {})
  }
  return calls
}

function renderProvider() {
  const state = {}
  function Probe() { Object.assign(state, useAppData()); return null }
  render(React.createElement(AppDataProvider, null, React.createElement(Probe)))
  return state
}

test.afterEach(() => { cleanup(); sessionStorage.clear() })
test.after(async () => { await server.close(); dom.window.close() })

test('com a API ligada, a sessão da portaria carrega as encomendas reais junto com os cadastros', async () => {
  fakeApi({ packages: [encomenda('e-1', 'AGUARDANDO RETIRADA', 'BR123')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'PORTARIA', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const state = renderProvider()
  await waitFor(() => assert.equal(state.remote.packages.status, 'success'))
  assert.equal(state.data.packages.length, 1)
  assert.equal(state.data.packages[0].code, 'BR123')
  assert.equal(state.data.packages[0].status, 'AGUARDANDO_RETIRADA')
  assert.equal(state.data.units.length, 1)
})

test('registrar e dar baixa passam pelo servidor e recarregam a lista', async () => {
  const calls = fakeApi({ packages: [encomenda('e-1', 'AGUARDANDO RETIRADA', 'BR123')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'PORTARIA', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const state = renderProvider()
  await waitFor(() => assert.equal(state.remote.packages.status, 'success'))

  await act(async () => { await state.actions.addPackageRemote({ tower: 'Torre A', unit: '101', code: 'NOVA1' }) })
  assert.deepEqual(calls.find((call) => call.path.endsWith('/recebimento')).body, { apartamentoId: 'a-101', codigoIdentificacao: 'NOVA1', observacao: null })
  await waitFor(() => assert.equal(state.data.packages.length, 2))

  await act(async () => { await state.actions.withdrawPackageRemote('e-1') })
  await waitFor(() => assert.equal(state.data.packages.find((item) => item.id === 'e-1').status, 'RETIRADA'))
})

test('falha só nas encomendas não derruba os cadastros', async () => {
  fakeApi({ packagesStatus: 400 })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'PORTARIA', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const state = renderProvider()
  await waitFor(() => assert.equal(state.remote.packages.status, 'error'))
  assert.equal(state.remote.packages.error, 'Falha nas encomendas')
  assert.equal(state.remote.units.status, 'success')
  assert.equal(state.data.units.length, 1)
  assert.deepEqual(state.data.packages, [])
})

test('comunicados também carregam na sessão e publicar/excluir passam pela API', async () => {
  const calls = fakeApi()
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'PORTARIA', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const state = renderProvider()
  await waitFor(() => assert.equal(state.remote.notices.status, 'success'))
  assert.equal(state.data.notices[0].title, 'Falta de água')
  assert.equal(state.data.notices[0].status, 'ATIVO')

  await act(async () => { await state.actions.saveNoticeRemote({ title: 'Novo', content: 'Texto', priority: 'NORMAL' }) })
  assert.deepEqual(calls.find((call) => call.method === 'POST' && call.path === '/interativo/avisos').body, { titulo: 'Novo', conteudo: 'Texto', prioridade: 'NORMAL', dataValidade: null, torreId: null })
  await act(async () => { await state.actions.deleteNoticeRemote('av-1') })
  assert.ok(calls.some((call) => call.method === 'DELETE' && call.path === '/interativo/avisos/av-1'))
  // Depois de cada comando a lista é recarregada do servidor
  assert.ok(calls.filter((call) => call.method === 'GET' && call.path === '/interativo/avisos').length >= 3)
})

const morador = { id: 'u-9', nome: 'Carla', perfil: 'MORADOR', apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', vinculo: 'INQUILINO', condominioNome: 'Residencial' }

test('reservas e áreas comuns carregam na sessão; confirmada que já passou vira Concluída', async () => {
  fakeApi({ me: morador, reservations: [reserva('r-1', 'AGUARDANDO APROVACAO'), reserva('r-2', 'CONFIRMADA', { dataReserva: '2020-01-10' })] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const state = renderProvider()
  await waitFor(() => assert.equal(state.remote.reservations.status, 'success'))
  assert.deepEqual(state.data.reservations.map((item) => [item.id, item.status, item.startTime]), [['r-1', 'AGUARDANDO_APROVACAO', '18:00'], ['r-2', 'CONCLUIDA', '18:00']])
  assert.equal(state.data.areas.length, 3)
})

test('tela de reservas do morador: só áreas reserváveis, agenda real e pedido pela API', async () => {
  const calls = fakeApi({ me: morador, reservations: [reserva('r-1', 'CONFIRMADA')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { ResidentListPage } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(ResidentListPage, { type: 'reservas' }))))

  assert.ok(await view.findByText('Salão de Festas'))
  fireEvent.click(view.getByRole('button', { name: /Nova reserva/ }))
  const area = view.getByLabelText(/Área comum/)
  // Inativa e não reservável ficam de fora
  assert.deepEqual([...area.querySelectorAll('option')].map((option) => option.textContent), ['Selecione', 'Salão de Festas'])
  fireEvent.change(area, { target: { value: 'Salão de Festas' } })
  fireEvent.change(view.getByLabelText(/^Data/), { target: { value: '2099-12-20' } })
  fireEvent.change(view.getByLabelText(/Horário inicial/), { target: { value: '19:00' } })
  fireEvent.change(view.getByLabelText(/Horário final/), { target: { value: '20:00' } })
  assert.ok(await view.findByText('Este horário já está ocupado.'))
  assert.ok(calls.some((call) => call.path === '/interativo/reservas/ocupacao'))
  assert.ok(view.getByText(/fica pendente até o proprietário/))

  // Passar da meia-noite pede a data final; com ela, a agenda dos dois dias é consultada
  fireEvent.change(view.getByLabelText(/Horário inicial/), { target: { value: '22:00' } })
  fireEvent.change(view.getByLabelText(/Horário final/), { target: { value: '01:00' } })
  assert.ok(await view.findByText(/informe a data final/))
  fireEvent.change(view.getByLabelText(/Termina no dia/), { target: { value: '2099-12-21' } })
  assert.ok(await view.findByText('Horário disponível.'))
  assert.ok(calls.some((call) => call.path === '/interativo/reservas/ocupacao' && call.query.data === '2099-12-21'))
  fireEvent.click(view.getAllByRole('button', { name: /Nova reserva/ }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/interativo/reservas')))
  assert.deepEqual(calls.find((call) => call.method === 'POST' && call.path === '/interativo/reservas').body, { areaId: 'ar-salao', dataReserva: '2099-12-20', horarioInicio: '22:00', horarioFim: '01:00', dataFim: '2099-12-21' })
  assert.ok(await view.findByText('Reserva solicitada. Ela fica pendente até ser aprovada.'))
})

test('aprovar e cancelar reservas passam pelas rotas do backend', async () => {
  const calls = fakeApi({ me: { ...morador, vinculo: 'PROPRIETARIO' }, reservations: [reserva('r-1', 'AGUARDANDO APROVACAO'), reserva('r-2', 'CONFIRMADA')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const state = renderProvider()
  await waitFor(() => assert.equal(state.remote.reservations.status, 'success'))
  await act(async () => { await state.actions.setReservationStatusRemote('r-1', 'CONFIRMADA') })
  await act(async () => { await state.actions.setReservationStatusRemote('r-2', 'CANCELADA') })
  assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/interativo/reservas/r-1/aprovar'))
  assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/interativo/reservas/r-2/cancelar'))
  await waitFor(() => assert.deepEqual(state.data.reservations.map((item) => item.status), ['CONFIRMADA', 'CANCELADA']))
})

const admin = { id: 'u-adm', nome: 'Admin', perfil: 'ADMIN', configuracaoInicial: 'CONCLUIDA', condominioNome: 'Residencial' }

test('tela de chamados do admin: histórico no detalhe, recategorização, status e comentário pela API', async () => {
  const calls = fakeApi({ me: admin, tickets: [chamado('c-1', 'ABERTO')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'ADMIN', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { default: EntityPage } = await server.ssrLoadModule('/src/pages/desktop/EntityPage.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(EntityPage, { role: 'admin', type: 'chamadosAdmin' }))))

  assert.ok(await view.findByText('Vazamento na garagem'))
  assert.ok(view.getByText('#C-1'))
  fireEvent.click(view.getByRole('button', { name: 'Ver detalhes' }))
  assert.ok(await view.findByText('Chamado aberto no sistema.', { exact: false }))
  // A prioridade não é editável na API; a categoria sim
  assert.equal(view.queryByLabelText('Prioridade do chamado'), null)
  fireEvent.change(view.getByLabelText('Categoria do chamado'), { target: { value: 'Elétrica' } })
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.body?.categoriaId === 'cat-eletrica')))
  assert.ok(await view.findByText('CATEGORIA: Outros -> Elétrica'))

  fireEvent.click(view.getAllByRole('button', { name: 'Em análise' }).at(-1))
  fireEvent.click(view.getAllByRole('button', { name: 'Alterar para Em análise' }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.body?.status === 'EM_ANALISE')))

  fireEvent.change(view.getByPlaceholderText('Descreva a atualização'), { target: { value: 'Técnico chamado' } })
  fireEvent.click(view.getByRole('button', { name: 'Adicionar comentário' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/atendimento/chamados/c-1/comentarios' && call.body.comentario === 'Técnico chamado')))
  assert.ok(await view.findByText('Técnico chamado', { exact: false }))
})

test('tela de chamados do morador: vê os de área comum, abre chamado sem categoria e comenta', async () => {
  const calls = fakeApi({ me: morador, tickets: [chamado('c-1', 'ABERTO')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { ResidentListPage } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(ResidentListPage, { type: 'chamados' }))))

  // Chamado de área comum (sem unidade) aparece para quem abriu
  assert.ok(await view.findByText('Vazamento na garagem'))
  fireEvent.click(view.getByRole('button', { name: /Abrir chamado/ }))
  assert.deepEqual([...view.getByLabelText(/^Local/).querySelectorAll('option')].map((option) => option.textContent), ['Selecione', '101 · Torre A', 'Área comum / condomínio'])
  fireEvent.change(view.getByLabelText(/^Título/), { target: { value: 'Portão rangendo' } })
  fireEvent.change(view.getByLabelText(/^Descrição/), { target: { value: 'Portão da garagem' } })
  fireEvent.change(view.getByLabelText(/^Local/), { target: { value: '101 · Torre A' } })
  fireEvent.change(view.getByLabelText(/^Prioridade/), { target: { value: 'NORMAL' } })
  fireEvent.click(view.getAllByRole('button', { name: /Abrir chamado/ }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/atendimento/chamados')))
  assert.deepEqual(calls.find((call) => call.method === 'POST' && call.path === '/atendimento/chamados').body,
    { titulo: 'Portão rangendo', descricao: 'Portão da garagem', categoriaId: null, apartamentoId: 'a-101', prioridade: 'NORMAL', imagemUrl: null })

  fireEvent.click((await view.findAllByText('Vazamento na garagem')).at(-1))
  assert.ok(await view.findByText('Chamado aberto no sistema.', { exact: false }))
  fireEvent.change(view.getByPlaceholderText('Escreva uma atualização ou pergunta'), { target: { value: 'Alguma previsão?' } })
  fireEvent.click(view.getByRole('button', { name: 'Adicionar comentário' }))
  await waitFor(() => assert.ok(calls.some((call) => call.path === '/atendimento/chamados/c-1/comentarios' && call.body.comentario === 'Alguma previsão?')))
})

test('tela de visitantes da portaria: registra pela unidade, autoriza, dá entrada e saída pela API', async () => {
  const calls = fakeApi({ visits: [visita('v-1', 'PENDENTE')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'PORTARIA', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { default: EntityPage } = await server.ssrLoadModule('/src/pages/desktop/EntityPage.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(EntityPage, { role: 'portaria', type: 'visitantesPortaria' }))))

  assert.ok(await view.findByText('Mariana Souza'))
  fireEvent.click(view.getByRole('button', { name: /Registrar visitante/ }))
  // O responsável é definido pelo servidor: o campo não aparece
  assert.equal(view.queryByLabelText(/Morador responsável/), null)
  fireEvent.change(view.getByLabelText(/^Nome/), { target: { value: 'Pedro Lima' } })
  fireEvent.change(view.getByLabelText(/^CPF/), { target: { value: '111.444.777-35' } })
  fireEvent.change(view.getAllByLabelText(/^Torre/).at(-1), { target: { value: 'Torre A' } })
  fireEvent.change(view.getByLabelText(/^Apartamento/), { target: { value: '101' } })
  fireEvent.change(view.getByLabelText(/Data de início/), { target: { value: '2099-12-30' } })
  fireEvent.change(view.getByLabelText(/Horário de início/), { target: { value: '10:00' } })
  fireEvent.change(view.getByLabelText(/Data de término/), { target: { value: '2099-12-30' } })
  fireEvent.change(view.getByLabelText(/Horário de término/), { target: { value: '12:00' } })
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/portaria/visitas')))
  assert.deepEqual(calls.find((call) => call.method === 'POST' && call.path === '/portaria/visitas').body, {
    cpf: '111.444.777-35', nome: 'Pedro Lima', telefone: null, apartamentoId: 'a-101', moradorId: null,
    dataInicio: '2099-12-30', horaInicio: '10:00', dataFim: '2099-12-30', horaFim: '12:00', observacao: null, autorizado: false,
  })
  assert.ok(await view.findByText('Pedro Lima'))

  // Pendente -> autorizar -> entrada -> saída, cada passo pela rota do backend
  for (const [button, confirmLabel, route] of [['Autorizar', 'Autorizar', 'autorizar'], ['Registrar entrada', 'Registrar entrada', 'entrada'], ['Registrar saída', 'Registrar saída', 'saida']]) {
    fireEvent.click(view.getAllByRole('button', { name: 'Ver detalhes' }).at(-1))
    fireEvent.click(await view.findByRole('button', { name: button }))
    fireEvent.click(view.getAllByRole('button', { name: confirmLabel }).at(-1))
    await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === `/portaria/visitas/v-1/${route}`)))
    await waitFor(() => assert.equal(view.queryByRole('button', { name: button }), null))
  }
})

test('tela de visitantes do morador: autoriza visitante e decide a pendente da unidade', async () => {
  const calls = fakeApi({ me: morador, visits: [visita('v-1', 'PENDENTE')] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { ResidentListPage } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(ResidentListPage, { type: 'visitantes' }))))

  assert.ok(await view.findByText('Mariana Souza'))
  fireEvent.click(view.getByRole('button', { name: /Autorizar visitante/ }))
  fireEvent.change(view.getByLabelText(/^Nome do visitante/), { target: { value: 'Tio João' } })
  fireEvent.change(view.getByLabelText(/^CPF/), { target: { value: '111.444.777-35' } })
  fireEvent.change(view.getByLabelText(/Data de início/), { target: { value: '2099-12-30' } })
  fireEvent.change(view.getByLabelText(/Horário de início/), { target: { value: '10:00' } })
  fireEvent.change(view.getByLabelText(/Data de término/), { target: { value: '2099-12-30' } })
  fireEvent.change(view.getByLabelText(/Horário de término/), { target: { value: '12:00' } })
  fireEvent.click(view.getAllByRole('button', { name: /Autorizar visitante/ }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/portaria/visitas')))
  const body = calls.find((call) => call.method === 'POST' && call.path === '/portaria/visitas').body
  assert.equal(body.apartamentoId, null)
  assert.equal(body.autorizado, null)
  assert.ok(await view.findByText('Tio João'))

  fireEvent.click(view.getByText('Mariana Souza'))
  fireEvent.click(await view.findByRole('button', { name: 'Autorizar' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Autorizar visita' }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/portaria/visitas/v-1/autorizar')))
})

test('tela de áreas comuns do admin: cadastra, liga a reserva de uma área existente e desativa pela API', async () => {
  const calls = fakeApi({ me: admin })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'ADMIN', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { default: EntityPage } = await server.ssrLoadModule('/src/pages/desktop/EntityPage.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(EntityPage, { role: 'admin', type: 'areasComuns' }))))

  assert.ok(await view.findByText('Piscina'))
  // Nova área: a opção de aprovação só aparece quando a área é reservável
  fireEvent.click(view.getByRole('button', { name: /Nova área comum/ }))
  assert.equal(view.queryByLabelText(/precisa de aprovação/), null)
  fireEvent.change(view.getByLabelText(/^Nome/), { target: { value: 'piscina' } })
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }))
  assert.ok(await view.findByText('Já existe uma área comum com este nome.'))
  fireEvent.change(view.getByLabelText(/^Nome/), { target: { value: 'Churrasqueira' } })
  fireEvent.change(view.getByLabelText(/Capacidade/), { target: { value: '20' } })
  fireEvent.click(view.getByLabelText(/Moradores podem reservar/))
  fireEvent.click(view.getByLabelText(/precisa de aprovação/))
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/condominios/areas-comuns')))
  assert.deepEqual(calls.find((call) => call.method === 'POST' && call.path === '/condominios/areas-comuns').body,
    { nome: 'Churrasqueira', descricao: null, regras: null, reservavel: true, exigeAprovacao: true, capacidade: 20 })
  assert.ok(await view.findByText('Churrasqueira'))

  // Área sugerida pelo wizard (não reservável) passa a aceitar reservas
  const piscina = view.getByText('Piscina').closest('tr')
  fireEvent.click(piscina.querySelector('.row-action'))
  fireEvent.click(await view.findByRole('button', { name: 'Editar' }))
  fireEvent.click(view.getByLabelText(/Moradores podem reservar/))
  fireEvent.click(view.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/condominios/areas-comuns/ar-piscina' && call.body.reservavel === true && call.body.exigeAprovacao === false)))

  const salao = view.getByText('Salão de Festas').closest('tr')
  fireEvent.click(salao.querySelector('.row-action'))
  fireEvent.click(await view.findByRole('button', { name: 'Desativar' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Desativar área comum' }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/condominios/areas-comuns/ar-salao/desativar')))
  await waitFor(() => assert.ok(view.getAllByText('Inativo').length >= 2))
})

test('proprietário vê o aviso de aprovação no painel e aprova pelo detalhe em Minhas reservas', async () => {
  const proprietario = { ...morador, id: 'u-prop', nome: 'Fernandinho', vinculo: 'PROPRIETARIO' }
  const calls = fakeApi({ me: proprietario, reservations: [reserva('r-1', 'AGUARDANDO APROVACAO', { moradorNome: 'Lucas Marques' })] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter, Route, Routes } = await import('react-router-dom')
  const { default: ResidentDashboard } = await server.ssrLoadModule('/src/pages/morador/ResidentDashboard.jsx')
  const { ResidentListPage } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, { initialEntries: ['/morador'] },
    React.createElement(Routes, null,
      React.createElement(Route, { path: '/morador', element: React.createElement(ResidentDashboard) }),
      React.createElement(Route, { path: '/morador/aprovacoes', element: React.createElement('div', null, 'Tela de aprovações') }),
    ))))

  const alert = await view.findByText('1 reserva aguarda sua aprovação')
  assert.ok(view.getByText(/Salão de Festas · 20\/12 · Lucas Marques/))
  fireEvent.click(alert)
  assert.ok(await view.findByText('Tela de aprovações'))
  cleanup()

  const list = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(ResidentListPage, { type: 'reservas' }))))
  fireEvent.click(await list.findByText('Salão de Festas'))
  // Não foi ele quem pediu: não cancela, mas aprova ou recusa
  assert.equal(list.queryByRole('button', { name: 'Cancelar reserva' }), null)
  fireEvent.click(await list.findByRole('button', { name: 'Aprovar' }))
  fireEvent.click(list.getAllByRole('button', { name: 'Aprovar reserva' }).at(-1))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/interativo/reservas/r-1/aprovar')))
})

test('inquilino não vê aviso de aprovação nem botões de aprovar', async () => {
  const calls = fakeApi({ me: morador, reservations: [reserva('r-1', 'AGUARDANDO APROVACAO', { moradorNome: 'Outro inquilino' })] })
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'MORADOR', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const { fireEvent } = await import('@testing-library/react')
  const { MemoryRouter } = await import('react-router-dom')
  const { default: ResidentDashboard } = await server.ssrLoadModule('/src/pages/morador/ResidentDashboard.jsx')
  const { ResidentListPage } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
  const dash = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(ResidentDashboard))))
  await dash.findByText(/Apartamento 101/)
  await waitFor(() => assert.ok(calls.some((call) => call.path === '/interativo/reservas')))
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
  assert.equal(dash.queryByText(/aguarda sua aprovação/), null)
  cleanup()
  const list = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(ResidentListPage, { type: 'reservas' }))))
  fireEvent.click(await list.findByText('Salão de Festas'))
  assert.equal(list.queryByRole('button', { name: 'Aprovar' }), null)
})
