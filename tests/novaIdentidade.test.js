import test from 'node:test'
import assert from 'node:assert/strict'
import { adminCounters, loadState, navigationCounts, pendingActions, shortDate, todayLabel, todaysReservations } from '../src/features/dashboard/dashboardData.js'
import { confirmationMessage, statusIntent } from '../src/config/uiPresentation.js'
import { buildFacade, facadeSummary, unitActivity, unitFloor, unitKey } from '../src/features/facade/facadeData.js'
import { balcaoSearch, insideNow, packagesOnShelf, visitsTimeline } from '../src/features/portaria/balcaoData.js'
import { residentFeed } from '../src/features/morador/residentFeed.js'

// Sábado, 22/11/2026, 14:40 (horário local)
const NOW = new Date(2026, 10, 22, 14, 40)
const TODAY = '2026-11-22'

const reservation = (id, status, extra = {}) => ({ id, area: 'Salão de Festas', resident: 'Mariana Silva', tower: 'Torre A', unit: '203', date: TODAY, startTime: '18:00', endTime: '23:00', status, ...extra })
const visitor = (id, status, extra = {}) => ({ id, name: 'Paula Mendes', cpf: '390.533.447-05', tower: 'Torre A', unit: '203', startDate: TODAY, startTime: '19:00', endDate: TODAY, endTime: '22:00', status, ...extra })

test('data do topo e data curta', () => {
  assert.equal(todayLabel(NOW), 'Domingo, 22 de novembro')
  assert.equal(todayLabel(new Date(2026, 11, 2)), 'Quarta-feira, 2 de dezembro')
  assert.equal(shortDate('2026-12-05'), '05/12')
  assert.equal(shortDate(''), '')
})

test('menu lateral conta só o que espera ação', () => {
  const data = {
    packages: [{ status: 'AGUARDANDO_RETIRADA' }, { status: 'RETIRADA' }, { status: 'AGUARDANDO_RETIRADA' }],
    reservations: [reservation('r1', 'AGUARDANDO_APROVACAO'), reservation('r2', 'AGUARDANDO_PAGAMENTO'), reservation('r3', 'CONFIRMADA')],
    tickets: [{ status: 'ABERTO' }, { status: 'EM_ANALISE' }],
    // pendente dentro da janela conta; pendente vencida vira EXPIRADO e não conta
    visitors: [visitor('v1', 'PENDENTE'), visitor('v2', 'PENDENTE', { endTime: '10:00' }), visitor('v3', 'AUTORIZADO')],
  }
  assert.deepEqual(navigationCounts(data, NOW), { packages: 2, reservations: 2, tickets: 1, visitors: 1 })
  const counters = adminCounters(data, NOW)
  assert.deepEqual(counters.map((item) => [item.key, item.count, item.to]), [['packages', 2, '/admin/encomendas'], ['reservations', 2, '/admin/reservas'], ['tickets', 1, '/admin/chamados']])
  assert.equal(counters[0].label, 'encomendas na portaria')
  assert.equal(counters[2].label, 'chamado aberto')
  assert.equal(adminCounters({}, NOW)[1].label, 'reservas pedem ação')
})

test('"Pede sua ação" reúne aprovação, pagamento, chamado aberto e comunicado urgente que vence hoje, nessa ordem', () => {
  const data = {
    reservations: [reservation('r2', 'AGUARDANDO_PAGAMENTO', { area: 'Churrasqueira', fee: 'R$ 80,00', date: '2026-11-23' }), reservation('r1', 'AGUARDANDO_APROVACAO'), reservation('r3', 'CONFIRMADA')],
    tickets: [{ id: 't1', title: 'Vazamento na garagem', status: 'ABERTO', location: 'Área comum', openedAt: '20/11 · 08:40' }, { id: 't2', title: 'Outro', status: 'EM_ANALISE' }],
    notices: [{ id: 'n1', title: 'Falta de água', priority: 'URGENTE', status: 'ATIVO', endDate: TODAY }, { id: 'n2', title: 'Normal', priority: 'NORMAL', status: 'ATIVO', endDate: TODAY }, { id: 'n3', title: 'Urgente de amanhã', priority: 'URGENTE', status: 'ATIVO', endDate: '2026-11-23' }],
  }
  const items = pendingActions(data, NOW)
  assert.deepEqual(items.map((item) => item.kind), ['approval', 'payment', 'ticket', 'notice'])
  assert.equal(items[0].title, 'Salão de Festas, 22/11, 18:00 às 23:00')
  assert.equal(items[0].subtitle, 'Mariana Silva · Torre A, 203')
  assert.equal(items[1].title, 'Churrasqueira, 23/11, R$ 80,00')
  assert.equal(items[2].subtitle, 'Área comum · aberto em 20/11 · 08:40')
  assert.equal(items[3].record.id, 'n1')
})

test('reservas de hoje incluem a que começou ontem e passa da meia-noite, sem canceladas', () => {
  const data = { reservations: [
    reservation('tarde', 'CONFIRMADA', { startTime: '19:00' }),
    reservation('manha', 'AGUARDANDO_PAGAMENTO', { startTime: '10:00' }),
    reservation('madrugada', 'CONFIRMADA', { date: '2026-11-21', endDate: TODAY, startTime: '22:00', endTime: '02:00' }),
    reservation('cancelada', 'CANCELADA'), reservation('recusada', 'RECUSADA'), reservation('amanha', 'CONFIRMADA', { date: '2026-11-23' }),
  ] }
  assert.deepEqual(todaysReservations(data, NOW).map((item) => item.id), ['madrugada', 'manha', 'tarde'])
})

test('andar da unidade: o da API primeiro; sem ele, o padrão andar + dois dígitos; casas e números fora do padrão ficam sem andar', () => {
  assert.equal(unitFloor({ number: '1-01', floor: 1 }), 1)
  assert.equal(unitFloor({ number: '001', floor: 0 }), 0)
  assert.equal(unitFloor({ number: '203' }), 2)
  assert.equal(unitFloor({ number: '1204' }), 12)
  assert.equal(unitFloor({ number: '001' }), 0)
  assert.equal(unitFloor({ number: '12' }), null)
  assert.equal(unitFloor({ number: 'Casa 5' }), null)
  assert.equal(unitFloor({ number: '101' }, 'HORIZONTAL'), null)
  assert.equal(unitKey(' Torre A ', '203'), unitKey('torre a', '203'))
})

test('fachada agrupa por torre e andar (do mais alto ao térreo), mede a ocupação e marca o que está pendente', () => {
  const units = [
    { id: 'b1', number: '101', tower: 'Torre B', status: 'LIVRE' },
    { id: 'a2', number: '202', tower: 'Torre A', status: 'OCUPADO' },
    { id: 'a1', number: '201', tower: 'Torre A', status: 'OCUPADO', floor: 2 },
    { id: 'a0', number: '001', tower: 'Torre A', status: 'INATIVO', floor: 0 },
    { id: 'a3', number: '101', tower: 'Torre A', status: 'RESERVADO' },
    { id: 'ax', number: 'Loja', tower: 'Torre A', status: 'LIVRE' },
  ]
  const data = { packages: [{ id: 'p', status: 'AGUARDANDO_RETIRADA', tower: 'Torre A', unit: '202' }, { id: 'sem', status: 'AGUARDANDO_RETIRADA', noRecipient: true, unit: '' }], reservations: [], tickets: [], visitors: [] }
  const activity = unitActivity(data, NOW)
  const [torreA, torreB] = buildFacade(units, { activity })
  assert.equal(torreA.name, 'Torre A')
  assert.deepEqual(torreA.floors.map((row) => [row.floor, row.cells.map((cell) => cell.number)]), [[2, ['201', '202']], [1, ['101']], [0, ['001']]])
  assert.deepEqual(torreA.loose.map((cell) => cell.number), ['Loja'])
  assert.deepEqual(torreA.floors[0].cells.map((cell) => [cell.state, cell.pending]), [['oc', 0], ['oc', 1]])
  assert.equal(torreA.floors[2].cells[0].state, 'in')
  assert.equal(torreA.floors[1].cells[0].state, 're')
  assert.equal(torreA.columns, 2)
  assert.deepEqual([torreA.total, torreA.occupied, torreA.pending], [5, 2, 1])
  assert.equal(torreB.floors[0].cells[0].state, 'li')
  assert.deepEqual(facadeSummary(units, activity), { total: 6, OCUPADO: 2, LIVRE: 2, RESERVADO: 1, INATIVO: 1, pending: 1 })
  // Edifício sem torre: um bloco só, sem nome
  assert.equal(buildFacade([{ id: 'e1', number: '101', tower: '', status: 'LIVRE' }])[0].name, '')
})

test('pendências por unidade: encomenda, reserva por aprovar ou pagar, chamado aberto e visita a autorizar', () => {
  const data = {
    packages: [{ id: 'p1', status: 'AGUARDANDO_RETIRADA', tower: 'Torre A', unit: '203' }, { id: 'p2', status: 'RETIRADA', tower: 'Torre A', unit: '203' }],
    reservations: [reservation('r1', 'AGUARDANDO_APROVACAO'), reservation('r2', 'AGUARDANDO_PAGAMENTO'), reservation('r3', 'CONFIRMADA')],
    tickets: [{ id: 't1', status: 'ABERTO', tower: 'Torre A', unit: '203' }, { id: 't2', status: 'EM_ANALISE', tower: 'Torre A', unit: '203' }],
    visitors: [visitor('v1', 'PENDENTE'), visitor('v2', 'PENDENTE', { endTime: '09:00' })],
  }
  const items = unitActivity(data, NOW).get(unitKey('Torre A', '203'))
  assert.deepEqual(items.map((item) => `${item.kind}:${item.record.id}`), ['package:p1', 'reservation:r1', 'reservation:r2', 'ticket:t1', 'visitor:v1'])
})

test('régua do balcão: janela de cada visita na escala do dia, rótulos e linha da hora atual', () => {
  const visitors = [
    visitor('dentro', 'ENTROU', { name: 'Mariana Souza', startTime: '14:00', endTime: '18:00', entryAt: 'Hoje · 14:20' }),
    visitor('janela', 'AUTORIZADO', { startTime: '19:00', endTime: '22:00' }),
    visitor('pendente', 'PENDENTE', { name: 'Diego Ramos', startTime: '15:00', endTime: '17:00' }),
    visitor('saiu', 'SAIU', { name: 'José', startTime: '08:00', endTime: '12:00', exitAt: '22/11 · 11:30' }),
    visitor('expirada', 'AUTORIZADO', { name: 'Lucas', startTime: '10:00', endTime: '11:00' }),
    visitor('recusada', 'RECUSADO', { name: 'Fora' }),
    visitor('ontem', 'AUTORIZADO', { name: 'Ontem', startDate: '2026-11-21', endDate: '2026-11-21' }),
    visitor('varios-dias', 'AUTORIZADO', { name: 'Hóspede', startDate: '2026-11-20', endDate: '2026-11-25', startTime: '09:00', endTime: '09:00' }),
  ]
  const timeline = visitsTimeline(visitors, NOW)
  assert.deepEqual(timeline.rows.map((row) => [row.id, row.kind]), [['varios-dias', 'janela'], ['saiu', 'saiu'], ['expirada', 'expirada'], ['dentro', 'dentro'], ['pendente', 'pendente'], ['janela', 'janela']])
  assert.equal(timeline.from, 0) // a visita de vários dias começa à meia-noite de hoje
  assert.equal(timeline.to, 24 * 60)
  const dentro = timeline.rows.find((row) => row.id === 'dentro')
  assert.equal(dentro.label, 'Dentro, 14:20')
  assert.equal(dentro.left, (14 * 60) / (24 * 60) * 100)
  assert.equal(dentro.window, '14:00 às 18:00')
  assert.equal(timeline.rows.find((row) => row.id === 'saiu').label, 'Saiu 11:30')
  assert.equal(timeline.rows.find((row) => row.id === 'pendente').outside, 'Aguardando o morador')
  assert.equal(timeline.rows.find((row) => row.id === 'expirada').outside, 'Expirada')
  assert.equal(timeline.rows.find((row) => row.id === 'varios-dias').window, '00:00 às 24:00')
  assert.equal(timeline.now.label, '14:40')
  // Só com visitas no horário comercial a escala fica entre 6h e 24h (múltiplos de 2h)
  const comercial = visitsTimeline([visitor('a', 'AUTORIZADO', { startTime: '09:00', endTime: '11:00' })], NOW)
  assert.deepEqual([comercial.from, comercial.to], [6 * 60, 24 * 60])
  assert.equal(comercial.hours[0].label, '7h')
  assert.deepEqual(visitsTimeline([], NOW).rows, [])
})

test('prateleira, quem está dentro e busca única do balcão', () => {
  const data = {
    packages: [
      { id: 'p1', code: 'ENC-1048', status: 'AGUARDANDO_RETIRADA', tower: 'Torre A', unit: '203', resident: 'Carlos Silva', receivedAt: 'Hoje · 14:32' },
      { id: 'p2', code: 'ENC-1040', status: 'RETIRADA', tower: 'Torre B', unit: '305', resident: 'Ana Souza' },
      { id: 'p3', code: 'XZ-9', status: 'AGUARDANDO_RETIRADA', noRecipient: true, resident: 'Destinatário não identificado' },
    ],
    visitors: [visitor('v1', 'ENTROU', { name: 'Mariana Souza', cpf: '111.222.333-44' }), visitor('v2', 'SAIU', { name: 'Roberto Santos', unit: '108' })],
    providers: [{ id: 'pr', name: 'José Almeida', status: 'ENTROU', location: '305', tower: 'Torre B' }],
  }
  assert.deepEqual(packagesOnShelf(data.packages).map((item) => item.id), ['p1', 'p3'])
  assert.deepEqual(insideNow(data).map((item) => item.label), ['Mariana Souza, Torre A, 203', 'José Almeida, 305, Torre B'])
  // CPF só pelos dígitos, unidade, código e nome do morador; primeiro o que pede ação
  assert.deepEqual(balcaoSearch(data, '222333', NOW).map((item) => item.id), ['v1'])
  assert.deepEqual(balcaoSearch(data, '203', NOW).map((item) => item.id), ['p1', 'v1'])
  assert.deepEqual(balcaoSearch(data, 'enc-10', NOW).map((item) => `${item.kind}:${item.id}`), ['package:p1', 'package:p2'])
  assert.deepEqual(balcaoSearch(data, 'xz', NOW).map((item) => item.subtitle.split(' · ')[0]), ['Sem destinatário'])
  assert.deepEqual(balcaoSearch(data, 'carlos', NOW).map((item) => [item.id, item.to]), [['p1', '/portaria/encomendas']])
  assert.deepEqual(balcaoSearch(data, 'roberto', NOW).map((item) => [item.id, item.to, item.status]), [['v2', '/portaria/visitantes', 'SAIU']])
  assert.deepEqual(balcaoSearch(data, '   ', NOW), [])
  assert.equal(balcaoSearch(data, 'a', NOW, 2).length, 2)
})

test('início do morador: pedidos de aprovação só para o proprietário, depois encomendas, visitas, chamados e reservas', () => {
  const resident = { id: 'm1', name: 'Carlos Silva', tower: 'Torre A', unit: '203', isOwner: true, profile: 'MORADOR' }
  const data = {
    currentResident: resident,
    notices: [
      { id: 'n1', title: 'Falta de água', priority: 'URGENTE', status: 'ATIVO', destination: 'Todo condomínio', startDate: '2026-11-20', endDate: '2026-11-30' },
      { id: 'n2', title: 'Piscina', priority: 'NORMAL', status: 'ATIVO', destination: 'Todo condomínio', startDate: '2026-11-21', endDate: '2026-11-30' },
    ],
    reservations: [reservation('r1', 'AGUARDANDO_APROVACAO', { resident: 'Mariana Silva', date: '2026-11-28' }), reservation('r2', 'CONFIRMADA', { area: 'Churrasqueira', date: '2026-11-30', startTime: '12:00', endTime: '17:00' }), reservation('outra', 'AGUARDANDO_APROVACAO', { unit: '305' })],
    packages: [{ id: 'p1', code: 'ENC-1048', status: 'AGUARDANDO_RETIRADA', tower: 'Torre A', unit: '203', receivedAt: 'Hoje · 14:32' }],
    visitors: [visitor('v1', 'AUTORIZADO'), visitor('v2', 'AUTORIZADO', { unit: '305' })],
    tickets: [{ id: 't1', title: 'Lâmpada queimada', status: 'EM_ATENDIMENTO', tower: 'Torre A', unit: '203' }, { id: 't2', title: 'Resolvido', status: 'RESOLVIDO', tower: 'Torre A', unit: '203' }],
  }
  const feed = residentFeed(data, {}, NOW)
  assert.equal(feed.urgent.id, 'n1')
  assert.deepEqual(feed.items.map((item) => item.kind), ['approval', 'package', 'visitor', 'ticket', 'reservation', 'notice'])
  assert.equal(feed.items[0].title, 'Reserva de Salão de Festas')
  assert.equal(feed.items[0].text, 'Pedido de Mariana Silva para 28/11, das 18:00 às 23:00. Precisa da sua aprovação.')
  assert.equal(feed.items[1].text, 'Código ENC-1048 · Hoje · 14:32')
  assert.equal(feed.items[2].title, 'Visita autorizada: Paula Mendes')
  assert.equal(feed.items[2].text, 'Hoje, das 19:00 às 22:00')
  assert.equal(feed.items[3].title, 'Chamado em atendimento')
  assert.equal(feed.items[4].title, 'Próxima reserva: Churrasqueira')
  assert.equal(feed.items[5].record.id, 'n2')
  // Inquilino não recebe pedidos de aprovação
  const tenant = residentFeed({ ...data, currentResident: { ...resident, isOwner: false } }, {}, NOW)
  assert.equal(tenant.items.some((item) => item.kind === 'approval'), false)
  // Síndico na visão de morador (API): só os chamados que ele mesmo abriu
  const sindico = { ...resident, profile: 'ADMIN' }
  const remote = residentFeed({ ...data, currentResident: sindico, tickets: [{ id: 'meu', title: 'Meu', status: 'EM_ANALISE', requesterId: 'm1' }, { id: 'alheio', title: 'De outro', status: 'EM_ANALISE', requesterId: 'x' }] }, { remoteTickets: true }, NOW)
  assert.deepEqual(remote.items.filter((item) => item.kind === 'ticket').map((item) => item.record.id), ['meu'])
})

test('painéis sabem quando a API ainda carrega ou falhou; reserva aguardando pagamento é aviso', () => {
  assert.deepEqual(loadState(undefined, ['packages']), { loading: false, errors: [] })
  const remote = { packages: { status: 'loading' }, reservations: { status: 'error', error: 'x' }, tickets: { status: 'success' } }
  const state = loadState(remote, ['packages', 'reservations', 'tickets'])
  assert.equal(state.loading, true)
  assert.deepEqual(state.errors, [{ key: 'reservations', message: 'Não foi possível carregar as reservas.' }])
  assert.equal(statusIntent('AGUARDANDO_PAGAMENTO'), 'warning')
  assert.match(confirmationMessage({ id: 'R1', area: 'Churrasqueira', date: '2026-11-23', startTime: '12:00', endTime: '17:00' }, 'Confirmar pagamento', 'PAGAMENTO_CONFIRMADO'), /pagamento ficará registrado/)
})
