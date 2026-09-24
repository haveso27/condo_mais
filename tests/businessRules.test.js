import test from 'node:test'
import assert from 'node:assert/strict'
import { initialAppData } from '../src/mocks/appData.js'
import { activeNotices, basicValidation, futureReservations, noticePeriodError, sameUnit, statusLabel, todayIso, unitDuplicate, unitEditPatch } from '../src/services/serviceUtils.js'
import { visitorEffectiveStatus, visitorEntryError, visitantesService } from '../src/services/visitantesService.js'
import { reservasService } from '../src/services/reservasService.js'
import { chamadosService } from '../src/services/chamadosService.js'
import { avisosService } from '../src/services/avisosService.js'
import { prestadoresService } from '../src/services/prestadoresService.js'

const data = initialAppData
const visitor = { ...data.visitors[0], startDate: '2026-10-10', endDate: '2026-10-10', startTime: '10:00', endTime: '11:00' }

test('entrada bloqueada antes e após; permitida nos limites inclusivos', () => {
  assert.match(visitorEntryError(visitor, new Date('2026-10-10T09:59:59')), /não iniciou/)
  for (const time of ['10:00:00', '10:30:00', '11:00:00']) assert.equal(visitorEntryError(visitor, new Date(`2026-10-10T${time}`)), '')
  assert.match(visitorEntryError(visitor, new Date('2026-10-10T11:00:01')), /expirou/)
  assert.equal(visitorEffectiveStatus(visitor, new Date('2026-10-10T11:00:01')), 'EXPIRADO')
  assert.equal(visitorEffectiveStatus({ ...visitor, status: 'ENTROU' }, new Date('2026-10-10T11:00:01')), 'ENTROU')
})
test('ação revalida período e não modifica registro futuro', () => {
  const future = { ...visitor, startDate: '2099-10-10', endDate: '2099-10-10' }
  const records = [future]
  assert.equal(visitantesService.alterarStatus(records, future.id, 'ENTROU'), records)
  const exited = visitantesService.alterarStatus([{ ...future, status: 'ENTROU' }], future.id, 'SAIU')[0]
  assert.equal(exited.status, 'SAIU')
})
test('editar preserva coleções completas e permite editar vínculo principal', () => {
  const original = { ...data.units[0], owners: ['Carlos Silva', 'Segundo proprietário'] }
  const form = { ...original, owner: 'Carlos Silva', resident: 'Carlos Silva' }
  assert.deepEqual(unitEditPatch(original, form), original)
  assert.deepEqual(unitEditPatch(original, { ...form, resident: 'Novo morador' }).residents, ['Novo morador', 'Mariana Silva'])
  assert.deepEqual(original.residents, ['Carlos Silva', 'Mariana Silva'])
})
test('mesmo número em outra torre não pertence ao morador', () => {
  for (const collection of ['packages', 'visitors', 'reservations', 'tickets']) {
    const same = { ...data[collection][0], tower: 'Torre A', unit: '203' }
    assert.equal(sameUnit(same, data.currentResident), true)
    assert.equal(sameUnit({ ...same, tower: 'Torre B' }, data.currentResident), false)
  }
  assert.equal(sameUnit({ unit: '203' }, data.currentResident), false)
})
test('serviço conserva conteúdo de comentários e transições', () => {
  const records = chamadosService.atualizar(data.tickets, '#CH-0028', { comments: ['Comentário de teste visível'] })
  const updated = chamadosService.atualizar(records, '#CH-0028', { status: 'RESOLVIDO' })
  assert.deepEqual(updated[0].comments, ['Comentário de teste visível'])
  assert.equal(updated[0].status, 'RESOLVIDO')
  assert.deepEqual(data.tickets[0].comments, [])
})
test('avisos ativos seguem fonte única e destino', () => {
  assert.equal(activeNotices(data.notices, data.currentResident).length, 2)
  const records = avisosService.atualizar(data.notices, 'AVI-401', { status: 'ENCERRADO' })
  assert.equal(activeNotices(records, data.currentResident).length, 1)
  assert.equal(activeNotices([{ ...data.notices[0], destination: 'Torre/Bloco específico', tower: 'Torre B' }], data.currentResident).length, 0)
})
test('torre e unidade de reservas e chamados filtram de fato', () => {
  for (const [service, records] of [[reservasService, data.reservations], [chamadosService, data.tickets]]) {
    assert.equal(service.listar(records, { tower: 'Torre C' }).length, 0)
    assert.equal(service.listar(records, { unit: '999' }).length, 0)
    assert.ok(service.listar(records, { tower: 'Torre A', unit: '203' }).length)
    assert.ok(service.listar(records, { tower: 'Torre A', unit: '203' }).every((item) => sameUnit(item, data.currentResident)))
  }
})
test('filtros prestadores e avisos mantêm os demais critérios', () => {
  assert.equal(prestadoresService.listar(data.providers, { tower: 'Área comum' }).length, 2)
  assert.equal(prestadoresService.listar(data.providers, { tower: 'Área comum', statuses: ['ENTROU'] }).length, 1)
  assert.equal(avisosService.listar(data.notices, { tower: 'Área comum' }).length, 0)
  assert.equal(avisosService.listar(data.notices, { tower: 'Torre A' }).length, 1)
  assert.equal(avisosService.listar(data.notices, { tower: 'Torre A', statuses: ['ATIVO'] }).length, 0)
})
test('vigência invertida bloqueada; mesma data e período crescente válidos', () => {
  assert.ok(noticePeriodError({ startDate: '2026-10-10', endDate: '2026-10-01' }))
  assert.equal(noticePeriodError({ startDate: '2026-10-01', endDate: '2026-10-01' }), '')
  assert.equal(noticePeriodError({ startDate: '2026-10-01', endDate: '2026-10-10' }), '')
})
test('formatos claramente inválidos rejeitados; formatos mock válidos aceitos', () => {
  for (const value of [{ cpf: 'abc' }, { cpf: '123' }, { email: 'email-invalido' }, { phone: 'x' }, { tower: 'Torre B', unit: '203' }]) assert.ok(basicValidation(value, data.units))
  assert.equal(basicValidation({ cpf: '111.222.333-44', email: 'teste@example.test', phone: '(81) 99999-9999', tower: 'Torre A', unit: '203' }, data.units), '')
  assert.equal(basicValidation({ cpf: '11122233344', phone: '' }), '')
})
test('unicidade composta e edição da própria unidade', () => {
  assert.equal(unitDuplicate(data.units, { tower: 'Torre A', number: '203' }), true)
  assert.equal(unitDuplicate(data.units, { tower: 'Torre B', number: '203' }), false)
  assert.equal(unitDuplicate(data.units, data.units[0], data.units[0].id), false)
})
test('próxima reserva futura ordenada, sem passado ou canceladas', () => {
  const rows = [{ date: '2026-10-03', startTime: '10:00', status: 'CONFIRMADA' }, { date: '2026-10-01', startTime: '10:00', status: 'CONFIRMADA' }, { date: '2026-10-02', startTime: '10:00', status: 'CONFIRMADA' }, { date: '2026-10-02', startTime: '09:00', status: 'CANCELADA' }]
  assert.deepEqual(futureReservations(rows, new Date('2026-10-01T11:00:00')).map((item) => item.date), ['2026-10-02', '2026-10-03'])
  assert.equal(futureReservations(rows, new Date('2026-10-04T00:00:00')).length, 0)
  assert.equal(rows[0].date, '2026-10-03')
})
test('data local usa o mesmo dia do horário após 21h em São Paulo', () => {
  const previous = process.env.TZ
  try {
    process.env.TZ = 'America/Sao_Paulo'
    const instant = new Date('2026-09-24T00:26:00Z')
    assert.equal(todayIso(instant), '2026-09-23')
    assert.equal(instant.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), '21:26')
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})
test('rótulos traduzidos e vínculos preservados', () => {
  assert.equal(statusLabel('EM_ATENDIMENTO'), 'Em atendimento')
  assert.equal(statusLabel('AGUARDANDO_APROVACAO'), 'Aguardando aprovação')
  assert.equal(statusLabel('CONCLUIDA'), 'Concluída')
  assert.equal(statusLabel('PROPRIETARIO'), 'Proprietário')
  assert.equal(statusLabel('INQUILINO'), 'Inquilino')
})
test('Regressão: reserva inválida/conflitante bloqueada, adjacente aceita e cancelamento libera', () => {
  const existing = { id: 'RES-TEST', area: 'Quadra', date: '2026-10-10', startTime: '10:00', endTime: '11:00', status: 'CONFIRMADA' }
  assert.equal(reservasService.verificarDisponibilidade([existing], { ...existing, id: undefined, startTime: '10:30', endTime: '11:30' }).available, false)
  assert.equal(reservasService.verificarDisponibilidade([], { ...existing, endTime: '09:00' }).available, false)
  assert.equal(reservasService.verificarDisponibilidade([existing], { ...existing, id: undefined, startTime: '11:00', endTime: '12:00' }).available, true)
  const cancelled = reservasService.alterarStatus([existing], existing.id, 'CANCELADA')
  assert.equal(reservasService.verificarDisponibilidade(cancelled, { ...existing, id: undefined }).available, true)
})
test('Regressão: proprietário/inquilino e separação de prestadores', () => {
  assert.equal(visitantesService.podeAutorizar(data.residents, data.currentResident), true)
  assert.equal(visitantesService.podeAutorizar(data.residents, data.residents[2]), true)
  assert.equal(visitantesService.podeAutorizar(data.residents, data.residents[4]), false)
  const tenant = reservasService.criar([], { area: 'Salão de Festas' }, data.residents[2]).record
  assert.equal(tenant.status, 'AGUARDANDO_APROVACAO')
  assert.equal(reservasService.alterarStatus([tenant], tenant.id, 'CONFIRMADA')[0].status, 'CONFIRMADA')
  assert.equal(reservasService.alterarStatus([tenant], tenant.id, 'RECUSADA')[0].status, 'RECUSADA')
  assert.equal(prestadoresService.alterarStatus(data.providers, 'PRE-203', 'ENTROU').length, data.providers.length)
  assert.equal(data.visitors.length, 6)
})
