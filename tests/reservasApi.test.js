import test from 'node:test'
import assert from 'node:assert/strict'
import { setToken } from '../src/services/api.js'
import { alterarStatusReserva, availabilityFromOccupation, bookableAreas, carregarOcupacao, carregarOcupacaoDoPeriodo, reservationEffectiveStatus, solicitarReserva, toArea, toReservation } from '../src/services/reservasApi.js'

const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }
globalThis.window = new EventTarget()

function fakeFetch(body = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }
  }
  return { fetchImpl, calls }
}

test('reserva da API vira reserva da tela, com horários HH:mm e status das abas', () => {
  const now = new Date('2026-10-27T12:00:00')
  const reserva = { id: 'r-1', areaId: 'ar-1', areaNome: 'Salão', dataReserva: '2026-11-02', horarioInicio: '18:00:00', horarioFim: '22:30', status: 'AGUARDANDO APROVACAO', moradorNome: 'Carla', apartamentoNumero: '101', torreNome: null, aprovadorNome: null }
  assert.deepEqual(toReservation(reserva, now), {
    id: 'r-1', area: 'Salão', areaId: 'ar-1', resident: 'Carla', tower: '', unit: '101', date: '2026-11-02', endDate: '',
    startTime: '18:00', endTime: '22:30', approvedBy: '', fee: '', paymentInstructions: '', paidBy: '', status: 'AGUARDANDO_APROVACAO',
  })
})

test('confirmada que já terminou aparece como Concluída; as demais não mudam', () => {
  const now = new Date('2026-10-27T12:00:00')
  assert.equal(reservationEffectiveStatus('CONFIRMADA', '2026-10-27', '11:59', now), 'CONCLUIDA')
  assert.equal(reservationEffectiveStatus('CONFIRMADA', '2026-10-27', '12:30', now), 'CONFIRMADA')
  assert.equal(reservationEffectiveStatus('CANCELADA', '2020-01-01', '10:00', now), 'CANCELADA')
})

test('só áreas ativas e reserváveis aparecem para reservar', () => {
  const areas = [
    { id: 'a', nome: 'Salão', reservavel: true, exigeAprovacao: true, ativo: true, capacidade: 80 },
    { id: 'b', nome: 'Piscina', reservavel: false, ativo: true },
    { id: 'c', nome: 'Quadra', reservavel: true, ativo: false },
  ].map(toArea)
  assert.deepEqual(bookableAreas(areas).map((area) => area.name), ['Salão'])
  assert.equal(areas[0].requiresApproval, true)
  assert.equal(areas[0].capacity, 80)
})

test('disponibilidade a partir da agenda real da área', () => {
  const occupied = [{ date: '2026-11-02', startTime: '18:00', endTime: '22:00' }]
  const day = { date: '2026-11-02' }
  assert.equal(availabilityFromOccupation(occupied, { ...day, startTime: '17:00', endTime: '18:30' }).available, false)
  assert.equal(availabilityFromOccupation(occupied, { ...day, startTime: '22:00', endTime: '23:00' }).available, true)
  assert.match(availabilityFromOccupation(occupied, { ...day, startTime: '20:00', endTime: '19:00' }).message, /posterior.*data final/)
})

test('reserva que passa da meia-noite: período com data final e conflito nos dois dias', () => {
  // Reserva de 22h às 02h que começou na véspera aparece na agenda do dia seguinte
  const occupied = [{ date: '2026-11-02', endDate: '2026-11-03', startTime: '22:00', endTime: '02:00' }]
  const night = { date: '2026-11-03', endDate: '2026-11-04', startTime: '23:00', endTime: '01:00' }
  assert.equal(availabilityFromOccupation(occupied, night).available, true)
  assert.equal(availabilityFromOccupation(occupied, { date: '2026-11-03', startTime: '01:00', endTime: '03:00' }).available, false)
  assert.equal(availabilityFromOccupation(occupied, { date: '2026-11-03', startTime: '02:00', endTime: '04:00' }).available, true)
  assert.equal(availabilityFromOccupation(occupied, { date: '2026-11-02', endDate: '2026-11-03', startTime: '23:00', endTime: '01:00' }).available, false)
  assert.match(availabilityFromOccupation([], { date: '2026-11-03', endDate: '2026-11-04', startTime: '10:00', endTime: '11:00' }).message, /24 horas/)
  assert.match(availabilityFromOccupation([], { date: '2026-11-03', endDate: '2026-11-02', startTime: '10:00', endTime: '11:00' }).message, /depois do início/)

  const reserva = { id: 'r-2', areaNome: 'Salão', dataReserva: '2026-11-02', dataFim: '2026-11-03', horarioInicio: '22:00:00', horarioFim: '02:00:00', status: 'CONFIRMADA' }
  assert.equal(toReservation(reserva, new Date('2026-11-03T01:00:00')).endDate, '2026-11-03')
  // Só fica Concluída depois das 02h do dia seguinte
  assert.equal(toReservation(reserva, new Date('2026-11-03T01:00:00')).status, 'CONFIRMADA')
  assert.equal(toReservation(reserva, new Date('2026-11-03T02:30:00')).status, 'CONCLUIDA')
})

test('agenda do período consulta o dia do início e o do fim, sem repetir a reserva noturna', async () => {
  setToken('token')
  const noturna = { dataReserva: '2026-11-02', dataFim: '2026-11-03', horarioInicio: '22:00:00', horarioFim: '02:00:00', status: 'CONFIRMADA' }
  const { fetchImpl, calls } = fakeFetch([noturna])
  const slots = await carregarOcupacaoDoPeriodo('ar-1', '2026-11-02', '2026-11-03', { fetchImpl })
  assert.equal(calls.length, 2)
  assert.match(calls[1].url, /data=2026-11-03$/)
  assert.deepEqual(slots, [{ date: '2026-11-02', endDate: '2026-11-03', startTime: '22:00', endTime: '02:00', status: 'CONFIRMADA' }])
})

test('ocupação, pedido e mudanças de status usam as rotas do backend', async () => {
  setToken('token')
  const { fetchImpl, calls } = fakeFetch([{ horarioInicio: '18:00:00', horarioFim: '22:00:00', status: 'CONFIRMADA' }])
  assert.deepEqual(await carregarOcupacao('ar-1', '2026-11-02', { fetchImpl }), [{ date: '2026-11-02', endDate: '2026-11-02', startTime: '18:00', endTime: '22:00', status: 'CONFIRMADA' }])
  assert.match(calls[0].url, /\/interativo\/reservas\/ocupacao\?areaId=ar-1&data=2026-11-02$/)

  await solicitarReserva({ area: 'Salão', date: '2026-11-02', startTime: '10:00', endTime: '12:00' }, [{ id: 'ar-1', name: 'Salão' }], { fetchImpl })
  assert.deepEqual(JSON.parse(calls[1].init.body), { areaId: 'ar-1', dataReserva: '2026-11-02', horarioInicio: '10:00', horarioFim: '12:00', dataFim: '2026-11-02' })
  await solicitarReserva({ area: 'Salão', date: '2026-11-02', endDate: '2026-11-03', startTime: '22:00', endTime: '02:00' }, [{ id: 'ar-1', name: 'Salão' }], { fetchImpl })
  assert.equal(JSON.parse(calls[2].init.body).dataFim, '2026-11-03')
  await assert.rejects(solicitarReserva({ area: 'Outra' }, [], { fetchImpl }), (error) => error.status === 400)

  for (const [status, route] of [['CONFIRMADA', 'aprovar'], ['RECUSADA', 'recusar'], ['CANCELADA', 'cancelar'], ['PAGAMENTO_CONFIRMADO', 'confirmar-pagamento']]) {
    await alterarStatusReserva('r-1', status, { fetchImpl })
    assert.equal(calls.at(-1).init.method, 'PUT')
    assert.equal(calls.at(-1).url.endsWith(`/interativo/reservas/r-1/${route}`), true)
  }
  assert.throws(() => alterarStatusReserva('r-1', 'CONCLUIDA', { fetchImpl }), (error) => error.status === 400)
})

test('área paga e reserva aguardando pagamento: taxa formatada, como pagar e quem confirmou', () => {
  const area = toArea({ id: 'a', nome: 'Salão', reservavel: true, ativo: true, taxa: 150, instrucoesPagamento: 'Pix do condomínio' })
  assert.match(area.fee, /^R\$\s?150,00$/)
  assert.equal(area.feeValue, '150')
  assert.equal(area.paymentInstructions, 'Pix do condomínio')
  assert.equal(toArea({ id: 'b', nome: 'Quadra', reservavel: true, ativo: true }).fee, '')

  const reserva = toReservation({ id: 'r', areaNome: 'Salão', dataReserva: '2099-12-20', horarioInicio: '18:00', horarioFim: '22:00', status: 'AGUARDANDO PAGAMENTO',
    valorTaxa: 150, instrucoesPagamento: 'Pix do condomínio', pagamentoConfirmadoPorNome: null })
  assert.equal(reserva.status, 'AGUARDANDO_PAGAMENTO')
  assert.match(reserva.fee, /150,00/)
  assert.equal(reserva.paymentInstructions, 'Pix do condomínio')
})
