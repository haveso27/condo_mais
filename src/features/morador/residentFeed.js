// Início do morador: uma fila com o que é da unidade dele, do que pede ação ao que é só informação.
import { activeNotices, futureReservations, sameUnit, statusLabel, todayIso } from '../../services/serviceUtils.js'
import { visitorEffectiveStatus } from '../../services/visitantesService.js'
import { shortDate } from '../dashboard/dashboardData.js'

// O síndico na visão de morador recebe todos os chamados do condomínio: aqui entram só os que ele abriu
const ownTicket = (ticket, resident, remoteTickets) => remoteTickets
  ? resident.profile !== 'ADMIN' || ticket.requesterId === resident.id
  : sameUnit(ticket, resident)

const when = (date, today) => (date === today ? 'Hoje' : shortDate(date))

export function residentFeed(data, { remoteTickets = false } = {}, now = new Date()) {
  const resident = data.currentResident
  const today = todayIso(now)
  const notices = activeNotices(data.notices || [], resident)
  const urgent = notices.find((item) => item.priority === 'URGENTE') || null
  const unitReservations = (data.reservations || []).filter((item) => sameUnit(item, resident))

  const approvals = resident.isOwner
    ? unitReservations.filter((item) => item.status === 'AGUARDANDO_APROVACAO').map((record) => ({
      kind: 'approval', id: `approval-${record.id}`, record,
      title: `Reserva de ${record.area}`,
      text: `Pedido de ${record.resident || 'morador da unidade'} para ${shortDate(record.date)}, das ${record.startTime} às ${record.endTime}. Precisa da sua aprovação.`,
    }))
    : []
  const packages = (data.packages || []).filter((item) => sameUnit(item, resident) && item.status === 'AGUARDANDO_RETIRADA').map((record) => ({
    kind: 'package', id: `package-${record.id}`, record,
    title: 'Encomenda na portaria',
    text: [record.code && `Código ${record.code}`, record.receivedAt].filter(Boolean).join(' · '),
  }))
  const visitors = (data.visitors || [])
    .filter((item) => sameUnit(item, resident) && item.startDate <= today && (item.endDate || item.startDate) >= today)
    .map((item) => ({ item, status: visitorEffectiveStatus(item, now) }))
    .filter(({ status }) => ['PENDENTE', 'AUTORIZADO', 'ENTROU'].includes(status))
    .map(({ item, status }) => ({
      kind: 'visitor', id: `visitor-${item.id}`, record: item, status,
      title: status === 'ENTROU' ? `${item.name} está no condomínio` : status === 'PENDENTE' ? `${item.name} aguarda autorização` : `Visita autorizada: ${item.name}`,
      text: `${when(item.startDate, today)}, das ${item.startTime} às ${item.endTime}`,
    }))
  const tickets = (data.tickets || [])
    .filter((item) => ownTicket(item, resident, remoteTickets) && ['EM_ANALISE', 'EM_ATENDIMENTO'].includes(item.status))
    .map((record) => ({ kind: 'ticket', id: `ticket-${record.id}`, record, title: `Chamado ${statusLabel(record.status).toLowerCase()}`, text: record.title }))
  const payments = unitReservations.filter((item) => item.status === 'AGUARDANDO_PAGAMENTO').map((record) => ({
    kind: 'payment', id: `payment-${record.id}`, record,
    title: `Reserva aguardando pagamento: ${record.area}`,
    text: `${shortDate(record.date)}, das ${record.startTime} às ${record.endTime}. A administração confirma o pagamento.`,
  }))
  const next = futureReservations(unitReservations, now)[0]
  const reservation = next ? [{ kind: 'reservation', id: `reservation-${next.id}`, record: next, title: `Próxima reserva: ${next.area}`, text: `${when(next.date, today)}, das ${next.startTime} às ${next.endTime}` }] : []
  const otherNotices = notices.filter((item) => item !== urgent).slice(0, 2).map((record) => ({
    kind: 'notice', id: `notice-${record.id}`, record, title: record.title, text: `Aviso · ${record.startDate}`,
  }))
  const items = [...approvals, ...packages, ...visitors, ...tickets, ...payments, ...reservation, ...otherNotices]
  return { urgent, items, approvals: approvals.length }
}
