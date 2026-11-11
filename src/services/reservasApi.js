import { ApiError, apiGet, apiPost, apiPut } from './api.js'

const hhmm = (value) => String(value || '').slice(0, 5)
const MAX_HOURS = 24

// Reserva confirmada cujo horário já passou aparece como CONCLUIDA (o backend não grava esse estado).
// date é o dia em que a reserva termina (o seguinte, quando passa da meia-noite).
export function reservationEffectiveStatus(status, date, endTime, now = new Date()) {
  if (status !== 'CONFIRMADA' || !date || !endTime) return status
  const end = new Date(`${date}T${hhmm(endTime)}:00`)
  return !Number.isNaN(end.getTime()) && end < now ? 'CONCLUIDA' : status
}

// Período completo de uma reserva ou de um pedido. Sem data final, termina no mesmo dia.
// Strings AAAA-MM-DDTHH:MM comparam na ordem certa sem converter para Date.
export function reservationPeriod({ date, endDate, startTime, endTime }) {
  return { start: `${date}T${hhmm(startTime)}`, end: `${endDate || date}T${hhmm(endTime)}` }
}

// Valida o pedido como o backend: fim depois do início e no máximo 24 horas
export function reservationPeriodError(candidate) {
  const { start, end } = reservationPeriod(candidate)
  if (start >= end) {
    return candidate.endDate && candidate.endDate !== candidate.date
      ? 'O fim da reserva deve ser depois do início.'
      : 'O horário final deve ser posterior ao inicial. Para passar da meia-noite, informe a data final (dia seguinte).'
  }
  const hours = (new Date(`${end}:00`) - new Date(`${start}:00`)) / 3_600_000
  return hours > MAX_HOURS ? 'Uma reserva pode durar no máximo 24 horas.' : ''
}

// ReservaResponseDTO -> reserva das telas. O status vem com espaço ("AGUARDANDO APROVACAO").
export function toReservation(reserva, now = new Date()) {
  const status = String(reserva.status || '').trim().toUpperCase().replace(/\s+/g, '_')
  return {
    id: reserva.id,
    area: reserva.areaNome || '',
    areaId: reserva.areaId || '',
    resident: reserva.moradorNome || '',
    tower: reserva.torreNome || '',
    unit: reserva.apartamentoNumero || '',
    date: reserva.dataReserva || '',
    // Só preenchida quando a reserva termina em outro dia (passa da meia-noite)
    endDate: reserva.dataFim && reserva.dataFim !== reserva.dataReserva ? reserva.dataFim : '',
    startTime: hhmm(reserva.horarioInicio),
    endTime: hhmm(reserva.horarioFim),
    approvedBy: reserva.aprovadorNome || '',
    // Área paga: valor cobrado, como pagar e quem confirmou o pagamento manual
    fee: reserva.valorTaxa != null ? formatFee(reserva.valorTaxa) : '',
    paymentInstructions: reserva.instrucoesPagamento || '',
    paidBy: reserva.pagamentoConfirmadoPorNome || '',
    status: reservationEffectiveStatus(status, reserva.dataFim || reserva.dataReserva, reserva.horarioFim, now),
  }
}

// AreaComumResponseDTO -> área para reservar
export function toArea(area) {
  return {
    id: area.id,
    name: area.nome || '',
    description: area.descricao || '',
    rules: area.regras || '',
    bookable: area.reservavel !== false,
    requiresApproval: Boolean(area.exigeAprovacao),
    active: area.ativo !== false,
    capacity: area.capacidade ?? null,
    fee: area.taxa != null ? formatFee(area.taxa) : '',
    feeValue: area.taxa != null ? String(area.taxa).replace('.', ',') : '',
    paymentInstructions: area.instrucoesPagamento || '',
    openTime: hhmm(area.horarioAbertura),
    closeTime: hhmm(area.horarioFechamento),
    hours: operatingHoursLabel(hhmm(area.horarioAbertura), hhmm(area.horarioFechamento)),
    status: area.ativo === false ? 'INATIVO' : 'ATIVO',
  }
}

// Admin e portaria recebem todas do condomínio; o morador, as da unidade dele
export async function carregarReservas(options) {
  const reservas = await apiGet('/interativo/reservas', {}, options)
  return (reservas || []).map((reserva) => toReservation(reserva))
}

export async function carregarAreasComuns(options) {
  const areas = await apiGet('/condominios/areas-comuns', {}, options)
  return (areas || []).map(toArea)
}

// Só áreas ativas e reserváveis entram no formulário do morador
export function bookableAreas(areas = []) {
  return areas.filter((area) => area.active && area.bookable)
}

// Horários ocupados de uma área num dia, sem dados de quem reservou. Inclui a reserva que começou na
// véspera e passa da meia-noite; cada horário traz as datas de início e fim.
export async function carregarOcupacao(areaId, date, options) {
  const horarios = await apiGet('/interativo/reservas/ocupacao', { areaId, data: date }, options)
  return (horarios || []).map((horario) => ({
    date: horario.dataReserva || date,
    endDate: horario.dataFim || horario.dataReserva || date,
    startTime: hhmm(horario.horarioInicio),
    endTime: hhmm(horario.horarioFim),
    status: horario.status,
  }))
}

// Agenda dos dias que o pedido toca: o do início e, se passar da meia-noite, o seguinte (sem repetir horários)
export async function carregarOcupacaoDoPeriodo(areaId, date, endDate, options) {
  const days = endDate && endDate !== date ? [date, endDate] : [date]
  const slots = (await Promise.all(days.map((day) => carregarOcupacao(areaId, day, options)))).flat()
  const seen = new Set()
  return slots.filter((slot) => {
    const key = `${slot.date}T${slot.startTime}|${slot.endDate}T${slot.endTime}`
    return seen.has(key) ? false : seen.add(key)
  })
}

export function availabilityFromOccupation(occupied, candidate) {
  if (!candidate.date || !candidate.startTime || !candidate.endTime) return { available: false, message: 'Preencha área, data e horários.' }
  const periodError = reservationPeriodError(candidate)
  if (periodError) return { available: false, message: periodError }
  const wanted = reservationPeriod(candidate)
  const conflict = occupied.some((slot) => {
    const taken = reservationPeriod({ ...slot, date: slot.date || candidate.date })
    return wanted.start < taken.end && wanted.end > taken.start
  })
  return conflict ? { available: false, message: 'Este horário já está ocupado.' } : { available: true, message: 'Horário disponível.' }
}

export async function solicitarReserva(form, areas, options) {
  const area = areas.find((item) => item.name === form.area)
  if (!area) throw new ApiError(400, 'Selecione uma área comum disponível.')
  return apiPost('/interativo/reservas', { areaId: area.id, dataReserva: form.date, horarioInicio: form.startTime, horarioFim: form.endTime, dataFim: form.endDate || form.date }, options)
}

// "08:00 às 22:00" ou "08:00 às 02:00 do dia seguinte"; vazio = sem horário definido
export function operatingHoursLabel(openTime, closeTime) {
  if (!openTime || !closeTime) return ''
  return `${openTime} às ${closeTime}${closeTime > openTime ? '' : ' do dia seguinte'}`
}

const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

// Mesma regra do backend: o período cabe no funcionamento do dia ou, se ele passa da meia-noite, no da véspera
export function operatingHoursError(area, candidate) {
  if (!area?.openTime || !area?.closeTime || !candidate.date || !candidate.startTime || !candidate.endTime) return ''
  const { start, end } = reservationPeriod(candidate)
  const overnight = area.closeTime <= area.openTime
  const fits = [addDays(candidate.date, -1), candidate.date].some((day) => {
    const opens = `${day}T${area.openTime}`
    const closes = `${overnight ? addDays(day, 1) : day}T${area.closeTime}`
    return start >= opens && end <= closes
  })
  return fits ? '' : `Fora do horário de funcionamento da área (${area.hours}).`
}

// PAGAMENTO_CONFIRMADO: a administração confirma o pagamento manual de uma área paga
const statusRoutes = { CANCELADA: 'cancelar', CONFIRMADA: 'aprovar', RECUSADA: 'recusar', PAGAMENTO_CONFIRMADO: 'confirmar-pagamento' }

// 150 -> "R$ 150,00"
export function formatFee(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function alterarStatusReserva(id, status, options) {
  const route = statusRoutes[status]
  if (!route) throw new ApiError(400, 'Ação de reserva inválida.')
  return apiPut(`/interativo/reservas/${id}/${route}`, undefined, options)
}
