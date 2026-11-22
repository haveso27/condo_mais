import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { createTestServer } from './viteTestServer.js'

// Telas da nova identidade visual, com a API ligada (API falsa abaixo): "Hoje" da administração, fachada e ficha
// da unidade, exclusão de torre com confirmação digitada, balcão da portaria e início do morador.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Event = dom.window.Event
globalThis.KeyboardEvent = dom.window.KeyboardEvent
globalThis.sessionStorage = dom.window.sessionStorage
globalThis.localStorage = dom.window.localStorage
dom.window.HTMLElement.prototype.scrollIntoView = () => {}

process.env.VITE_API_URL = 'http://api.test'
const server = await createTestServer()
delete process.env.VITE_API_URL
const { cleanup, fireEvent, render, waitFor, within } = await import('@testing-library/react')
const { MemoryRouter, Route, Routes, useLocation } = await import('react-router-dom')
// Guarda a última localização (para conferir que o pedido de navegação sai do histórico depois de atendido)
const lastLocation = { current: null }
function LocationProbe() { lastLocation.current = useLocation(); return null }
const { AppDataProvider } = await server.ssrLoadModule('/src/context/AppDataContext.jsx')
const { default: DesktopDashboard } = await server.ssrLoadModule('/src/pages/desktop/DesktopDashboard.jsx')
const { default: EntityPage } = await server.ssrLoadModule('/src/pages/desktop/EntityPage.jsx')
const { default: ResidentDashboard } = await server.ssrLoadModule('/src/pages/morador/ResidentDashboard.jsx')
const { ResidentListPage } = await server.ssrLoadModule('/src/pages/morador/ResidentPages.jsx')
const { todayIso } = await server.ssrLoadModule('/src/services/serviceUtils.js')

const TODAY = todayIso()
const jwt = (claims) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.assinatura`
}
const admin = { id: 'u-adm', nome: 'Carla Síndica', cpf: '529.982.247-25', perfil: 'ADMIN', status: 'ATIVO', configuracaoInicial: 'CONCLUIDA', condominioNome: 'Parque das Flores', condominioModelo: 'VERTICAL' }
const porteiro = { id: 'u-por', nome: 'João', cpf: '111.444.777-35', perfil: 'PORTARIA', status: 'ATIVO', condominioNome: 'Parque das Flores' }
const morador = { id: 'u-mor', nome: 'Carlos Silva', cpf: '390.533.447-05', perfil: 'MORADOR', status: 'ATIVO', vinculo: 'PROPRIETARIO', apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', condominioNome: 'Parque das Flores' }

const reserva = (id, status, extra = {}) => ({ id, areaId: 'ar-salao', areaNome: 'Salão de Festas', dataReserva: '2099-12-20', horarioInicio: '18:00:00', horarioFim: '22:00:00', status, moradorNome: 'Mariana Silva', apartamentoNumero: '101', torreNome: 'Torre A', ...extra })
const encomenda = (id, status, codigo, extra = {}) => ({ id, codigoIdentificacao: codigo, status, dataHoraRecebimento: `${TODAY}T10:00:00`, apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', moradorNome: 'Carlos Silva', porteiroRecebimentoNome: 'João', ...extra })
const visita = (id, status, extra = {}) => ({ id, status, origem: 'PORTARIA', visitanteNome: 'Mariana Souza', visitanteCpf: '529.982.247-25', apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', moradorNome: 'Carlos Silva', dataInicio: TODAY, horaInicio: '00:00:00', dataFim: TODAY, horaFim: '23:59:00', ...extra })

function fakeApi(me, { failReservations = false } = {}) {
  const calls = []
  let reservationFailures = failReservations ? 1 : 0
  let bookings = [reserva('r-1', 'AGUARDANDO APROVACAO'), reserva('r-2', 'AGUARDANDO PAGAMENTO', { areaNome: 'Churrasqueira', valorTaxa: 80, apartamentoNumero: '201' }), reserva('r-3', 'CONFIRMADA', { areaNome: 'Quadra', dataReserva: TODAY, horarioInicio: '00:00:00', horarioFim: '23:59:00', apartamentoNumero: '201' })]
  let parcels = [encomenda('e-1', 'AGUARDANDO RETIRADA', 'ENC-1'), encomenda('e-2', 'RETIRADA', 'ENC-2', { apartamentoNumero: '201' })]
  let towers = [{ id: 't-a', nome: 'Torre A' }, { id: 't-b', nome: 'Torre B' }]
  let apartments = [
    { id: 'a-101', numero: '101', torreId: 't-a', status: 'OCUPADO', andar: 1 }, { id: 'a-102', numero: '102', torreId: 't-a', status: 'LIVRE', andar: 1 },
    { id: 'a-201', numero: '201', torreId: 't-a', status: 'OCUPADO', andar: 2 }, { id: 'b-001', numero: '001', torreId: 't-b', status: 'RESERVADO', andar: 0 },
  ]
  const tickets = [{ id: 'c-1', titulo: 'Vazamento na garagem', descricao: 'Perto da vaga 12', prioridade: 'NORMAL', status: 'ABERTO', categoriaId: 'cat-outros', categoriaNome: 'Outros', apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', solicitanteNome: 'Carlos Silva', solicitanteId: 'u-mor', dataAbertura: `${TODAY}T08:40:00` }]
  const visits = [visita('v-1', 'PENDENTE', { visitanteNome: 'Diego Ramos' }), visita('v-2', 'ENTROU', { visitanteNome: 'Mariana Souza', dataHoraEntrada: `${TODAY}T14:20:00` })]
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname
    const method = init.method || 'GET'
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ method, path, body })
    const reply = (status, payload) => ({ ok: status < 400, status, json: async () => payload, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) })
    if (path === '/usuarios/me') return reply(200, me)
    if (path === '/usuarios') return reply(200, [morador])
    if (path === '/condominios/torres') return reply(200, towers)
    if (path === '/condominios/apartamentos') return reply(200, apartments)
    const towerDelete = path.match(/^\/condominios\/torres\/([^/]+)$/)
    if (towerDelete && method === 'DELETE') { towers = towers.filter((item) => item.id !== towerDelete[1]); apartments = apartments.filter((item) => item.torreId !== towerDelete[1]); return reply(204, undefined) }
    if (path === '/interativo/reservas' && method === 'GET') {
      if (reservationFailures > 0) { reservationFailures -= 1; return reply(500, { mensagem: 'Erro' }) }
      return reply(200, bookings)
    }
    const booking = path.match(/^\/interativo\/reservas\/([^/]+)\/(aprovar|recusar|cancelar|confirmar-pagamento)$/)
    if (booking) {
      const [, id, action] = booking
      const status = { aprovar: 'CONFIRMADA', recusar: 'RECUSADA', cancelar: 'CANCELADA', 'confirmar-pagamento': 'CONFIRMADA' }[action]
      bookings = bookings.map((item) => item.id === id ? { ...item, status } : item)
      return reply(200, bookings.find((item) => item.id === id))
    }
    if (path === '/portaria/encomendas' && method === 'GET') return reply(200, parcels)
    const pickup = path.match(/^\/portaria\/encomendas\/([^/]+)\/retirada$/)
    if (pickup) { parcels = parcels.map((item) => item.id === pickup[1] ? { ...item, status: 'RETIRADA' } : item); return reply(200, parcels.find((item) => item.id === pickup[1])) }
    if (path === '/portaria/visitas' && method === 'GET') return reply(200, visits)
    if (path === '/atendimento/chamados' && method === 'GET') return reply(200, tickets)
    if (path.startsWith('/atendimento/chamados/')) return reply(200, { ...tickets[0], historico: [{ acao: 'ABERTURA', comentario: 'Chamado aberto no sistema.', dataHora: `${TODAY}T08:40:00`, usuarioNome: 'Carlos Silva' }] })
    if (path === '/atendimento/categorias') return reply(200, [{ id: 'cat-outros', nome: 'Outros' }])
    if (path === '/condominios/areas-comuns') return reply(200, [{ id: 'ar-salao', nome: 'Salão de Festas', reservavel: true, exigeAprovacao: true, ativo: true }])
    if (path === '/interativo/avisos') return reply(200, [{ id: 'av-1', titulo: 'Falta de água', conteudo: 'Bomba em manutenção', prioridade: 'URGENTE', dataValidade: null, ativo: true, criadoEm: `${TODAY}T09:00:00`, autorNome: 'Admin', torreId: null, torreNome: null }])
    return reply(200, [])
  }
  return calls
}

function renderAt(me, profile, entries, routes, options = {}) {
  const calls = fakeApi(me, options)
  sessionStorage.setItem('condoplus.token', jwt({ perfil: profile, condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  const view = render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, { initialEntries: entries },
    React.createElement(LocationProbe),
    React.createElement(Routes, null, ...routes.map(([path, element]) => React.createElement(Route, { key: path, path, element }))))))
  return { view, calls }
}
const adminRoutes = [
  ['/admin', React.createElement(DesktopDashboard, { role: 'admin' })],
  ['/admin/unidades', React.createElement(EntityPage, { role: 'admin', type: 'unidades' })],
  ['/admin/chamados', React.createElement(EntityPage, { role: 'admin', type: 'chamadosAdmin' })],
  ['/admin/encomendas', React.createElement(EntityPage, { role: 'admin', type: 'encomendasAdmin' })],
]
const portariaRoutes = [
  ['/portaria', React.createElement(DesktopDashboard, { role: 'portaria' })],
  ['/portaria/encomendas', React.createElement(EntityPage, { role: 'portaria', type: 'encomendasPortaria' })],
  ['/portaria/visitantes', React.createElement(EntityPage, { role: 'portaria', type: 'visitantesPortaria' })],
]

test.afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear() })
test.after(async () => { await server.close(); dom.window.close() })

test('Hoje: contadores com ícone, menu com +N e itens que pedem ação da administração', async () => {
  const { view, calls } = renderAt(admin, 'ADMIN', ['/admin'], adminRoutes)
  // Contadores (sem frase): número e rótulo curto, cada um leva à lista
  assert.ok(await view.findByRole('button', { name: '1 encomenda na portaria' }))
  assert.ok(view.getByRole('button', { name: '2 reservas pedem ação' }))
  assert.ok(view.getByRole('button', { name: '1 chamado aberto' }))
  // Menu dividido em "Dia a dia" e "Cadastro", com o +N no link
  assert.ok(view.getByText('Dia a dia'))
  assert.ok(view.getByText('Cadastro'))
  assert.ok(view.getByRole('link', { name: 'Reservas (2 pedem sua ação)' }))
  assert.ok(view.getByRole('link', { name: 'Equipe' }))
  // Reservas de hoje
  assert.ok(view.getByText('Quadra'))
  // Recusar é botão de contorno vinho (não parece link)
  const recusar = view.getByRole('button', { name: 'Recusar' })
  assert.match(recusar.className, /danger-button/)
  // Aprovar pede confirmação e usa a rota do backend
  fireEvent.click(view.getByRole('button', { name: 'Aprovar' }))
  const dialog = await view.findByRole('dialog', { name: 'Aprovar reserva' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Aprovar reserva' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/interativo/reservas/r-1/aprovar')))
  assert.ok(await view.findByText('Reserva aprovada.'))
  // Confirmar pagamento
  fireEvent.click(view.getByRole('button', { name: 'Confirmar pagamento' }))
  fireEvent.click(within(await view.findByRole('dialog', { name: 'Confirmar pagamento' })).getByRole('button', { name: 'Confirmar pagamento' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/interativo/reservas/r-2/confirmar-pagamento')))
  await waitFor(() => assert.equal(view.queryByRole('button', { name: 'Confirmar pagamento' }), null))
})

test('Hoje: "Ver chamado" abre a ficha lateral do chamado com os degraus do andamento', async () => {
  const { view } = renderAt(admin, 'ADMIN', ['/admin'], adminRoutes)
  fireEvent.click(await view.findByRole('button', { name: 'Ver chamado' }))
  const drawer = await view.findByRole('dialog')
  assert.ok(await within(drawer).findByText('Vazamento na garagem', { selector: 'strong' }))
  const steps = within(drawer).getByRole('list', { name: 'Andamento do chamado' })
  assert.equal(steps.querySelector('[aria-current="step"]').textContent.startsWith('+Aberto'), true)
})

test('Hoje: a fachada mostra as torres por andar; clicar na unidade abre a ficha dela em Unidades', async () => {
  const { view } = renderAt(admin, 'ADMIN', ['/admin'], adminRoutes)
  const unit = await view.findByRole('button', { name: /^Unidade 101, Torre A, ocupado, \d pendências?$/ })
  assert.ok(view.getByRole('button', { name: 'Unidade 001, Torre B, reservado' }))
  const torreA = view.getByRole('region', { name: 'Torre A' })
  assert.deepEqual([...torreA.querySelectorAll('.u b')].map((item) => item.textContent), ['201', '101', '102'])
  fireEvent.click(unit)
  const drawer = await view.findByRole('dialog', { name: 'Unidade 101 · Torre A' })
  assert.ok(within(drawer).getByText('Agora'))
  assert.ok(within(drawer).getByText(/Encomenda ENC-1 na portaria/))
})

test('Unidades: fachada por padrão, lista a um clique, filtro "Com pendência" com contagem', async () => {
  const { view } = renderAt(admin, 'ADMIN', ['/admin/unidades'], adminRoutes)
  assert.ok(await view.findByRole('button', { name: /^Unidade 201, Torre A, ocupado/ }))
  assert.equal(view.queryByRole('table'), null)
  const pending = view.getByRole('button', { name: /Com pendência/ })
  assert.equal(pending.querySelector('.tab-count').textContent, '2')
  fireEvent.click(pending)
  assert.equal(view.queryByRole('button', { name: /^Unidade 102,/ }), null)
  fireEvent.click(view.getByRole('button', { name: 'Lista' }))
  const table = view.getByRole('table')
  assert.deepEqual([...table.querySelectorAll('tbody tr')].map((row) => row.querySelector('td').textContent.slice(0, 3)).sort(), ['101', '201'])
  // A linha inteira abre a ficha lateral
  fireEvent.click(within(table).getByText('201'))
  assert.ok(await view.findByRole('dialog', { name: 'Unidade 201 · Torre A' }))
})

test('Unidades: excluir torre só depois de digitar o nome dela', async () => {
  const { view, calls } = renderAt(admin, 'ADMIN', ['/admin/unidades'], adminRoutes)
  await view.findByRole('button', { name: /^Unidade 001, Torre B/ })
  fireEvent.click(view.getByRole('button', { name: 'Excluir torre' }))
  const dialog = await view.findByRole('dialog', { name: 'Excluir torre' })
  fireEvent.change(within(dialog).getByRole('combobox', { name: /Torre \/ Bloco/ }), { target: { value: 'Torre B' } })
  const confirm = within(dialog).getByRole('button', { name: 'Excluir torre e unidades' })
  assert.equal(confirm.disabled, true)
  const field = within(dialog).getByRole('textbox', { name: /Para confirmar, digite/ })
  fireEvent.change(field, { target: { value: 'Torre' } })
  assert.equal(confirm.disabled, true)
  fireEvent.click(confirm)
  assert.equal(calls.some((call) => call.method === 'DELETE'), false)
  fireEvent.change(field, { target: { value: 'torre b' } })
  assert.equal(confirm.disabled, false)
  fireEvent.click(confirm)
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'DELETE' && call.path === '/condominios/torres/t-b')))
  assert.ok(await view.findByText('Torre "Torre B" excluída com as unidades dela.'))
})

test('Balcão: busca única, atalhos de teclado e retirada pela prateleira usam os fluxos das telas', async () => {
  const { view, calls } = renderAt(porteiro, 'PORTARIA', ['/portaria'], portariaRoutes)
  // Régua com a visita pendente e quem está dentro agora
  assert.ok(await view.findByRole('button', { name: /^Diego Ramos, Visita para Torre A, 101, Pendente/ }))
  assert.ok(view.getByText('Mariana Souza, Torre A, 101', { selector: '.chip' }))
  // Busca: código da encomenda
  fireEvent.change(view.getByRole('searchbox', { name: 'Buscar no balcão' }), { target: { value: 'enc-1' } })
  const results = view.getByRole('region', { name: 'Resultados da busca' })
  assert.ok(within(results).getByText('ENC-1'))
  // Prateleira: "Retirada" abre direto a confirmação com o nome de quem retira
  fireEvent.click(view.getByRole('button', { name: 'Registrar retirada da encomenda ENC-1' }))
  const dialog = await view.findByRole('dialog', { name: 'Confirmar retirada' })
  fireEvent.change(within(dialog).getByRole('textbox', { name: /Nome de quem está retirando/ }), { target: { value: 'Carlos Silva' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar retirada' }))
  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/portaria/encomendas/e-1/retirada' && call.body.retiranteNome === 'Carlos Silva')))
})

test('Balcão: F2 abre o registro de encomenda e Ctrl K vai para a busca', async () => {
  const { view } = renderAt(porteiro, 'PORTARIA', ['/portaria'], portariaRoutes)
  const search = await view.findByRole('searchbox', { name: 'Buscar no balcão' })
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  assert.equal(document.activeElement, search)
  fireEvent.keyDown(window, { key: 'F2' })
  assert.ok(await view.findByRole('dialog', { name: 'Registrar encomenda' }))
  // Atendido, o pedido sai do histórico: voltar pelo navegador não reabre o formulário
  assert.equal(lastLocation.current.pathname, '/portaria/encomendas')
  assert.equal(lastLocation.current.state, null)
})

test('Hoje: falha ao carregar as reservas aparece no painel com "Tentar novamente"', async () => {
  const { view, calls } = renderAt(admin, 'ADMIN', ['/admin'], adminRoutes, { failReservations: true })
  const alerts = await view.findAllByText('Não foi possível carregar as reservas.')
  assert.ok(alerts.length >= 1)
  const before = calls.filter((call) => call.path === '/interativo/reservas').length
  fireEvent.click(view.getAllByRole('button', { name: 'Tentar novamente' })[0])
  await waitFor(() => assert.ok(calls.filter((call) => call.path === '/interativo/reservas').length > before))
  assert.ok(await view.findByRole('button', { name: 'Aprovar' }))
  await waitFor(() => assert.equal(view.queryByText('Não foi possível carregar as reservas.'), null))
})

test('Início do morador: urgente no topo, novidades da unidade e atalho que já abre a autorização de visita', async () => {
  const routes = [['/morador', React.createElement(ResidentDashboard)], ['/morador/visitantes', React.createElement(ResidentListPage, { type: 'visitantes' })]]
  const { view } = renderAt(morador, 'MORADOR', ['/morador'], routes)
  assert.ok(await view.findByText(/Apartamento 101/))
  assert.ok(await view.findByText('Falta de água'))
  assert.ok(await view.findByText('Reserva de Salão de Festas'))
  // Encomenda: o código em destaque
  fireEvent.click(await view.findByRole('button', { name: /Encomenda na portaria/ }))
  const parcel = await view.findByRole('dialog', { name: 'Sua encomenda chegou' })
  assert.ok(within(parcel).getByText('ENC-1'))
  fireEvent.click(within(parcel).getAllByRole('button', { name: 'Fechar' }).at(-1))
  // "Autorizar visita" já abre o formulário; "Amanhã" preenche as datas
  fireEvent.click(view.getByRole('button', { name: 'Autorizar visita' }))
  const form = await view.findByRole('dialog', { name: 'Autorizar visitante' })
  fireEvent.click(within(form).getByRole('button', { name: 'Amanhã' }))
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const iso = todayIso(tomorrow)
  assert.deepEqual([...form.querySelectorAll('input[type="date"]')].map((input) => input.value), [iso, iso])
  assert.equal(lastLocation.current.state, null)
})
