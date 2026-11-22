// Dados dos painéis (administração e menu lateral). Funções puras: recebem os registros e devolvem o que a tela mostra.
import { todayIso } from '../../services/serviceUtils.js'
import { visitorEffectiveStatus } from '../../services/visitantesService.js'

export const RESERVATION_ACTION_STATUSES = ['AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO']
const OPEN_TICKET_STATUSES = ['ABERTO']
const INACTIVE_RESERVATION = ['CANCELADA', 'RECUSADA']

// "Sábado, 22 de novembro"
export function todayLabel(now = new Date()) {
  const text = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "22/11"
export function shortDate(iso = '') {
  const [, month, day] = String(iso).split('-')
  return month && day ? `${day}/${month}` : iso
}

const plural = (count, one, many) => (count === 1 ? one : many)

// Contagens do menu lateral (+N): o que está esperando alguém do condomínio agir
export function navigationCounts(data, now = new Date()) {
  return {
    packages: (data.packages || []).filter((item) => item.status === 'AGUARDANDO_RETIRADA').length,
    reservations: (data.reservations || []).filter((item) => RESERVATION_ACTION_STATUSES.includes(item.status)).length,
    tickets: (data.tickets || []).filter((item) => OPEN_TICKET_STATUSES.includes(item.status)).length,
    visitors: (data.visitors || []).filter((item) => visitorEffectiveStatus(item, now) === 'PENDENTE').length,
  }
}

// Contadores do "Hoje" da administração: ícone, número e um rótulo curto, cada um levando à lista
export function adminCounters(data, now = new Date()) {
  const counts = navigationCounts(data, now)
  return [
    { key: 'packages', count: counts.packages, label: plural(counts.packages, 'encomenda na portaria', 'encomendas na portaria'), to: '/admin/encomendas' },
    { key: 'reservations', count: counts.reservations, label: plural(counts.reservations, 'reserva pede ação', 'reservas pedem ação'), to: '/admin/reservas' },
    { key: 'tickets', count: counts.tickets, label: plural(counts.tickets, 'chamado aberto', 'chamados abertos'), to: '/admin/chamados' },
  ]
}

const unitLabel = (record) => [record.tower, record.unit].filter(Boolean).join(', ')
const period = (record) => `${record.startTime || ''}${record.endTime ? ` às ${record.endTime}` : ''}`

// "Pede sua ação": só o que depende da administração, com a ação de cada item
export function pendingActions(data, now = new Date()) {
  const today = todayIso(now)
  const reservations = (data.reservations || []).slice().sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
  const approvals = reservations.filter((item) => item.status === 'AGUARDANDO_APROVACAO').map((record) => ({
    kind: 'approval', id: `approval-${record.id}`, record,
    title: `${record.area}, ${shortDate(record.date)}, ${period(record)}`,
    subtitle: [record.resident, unitLabel(record)].filter(Boolean).join(' · '),
  }))
  const payments = reservations.filter((item) => item.status === 'AGUARDANDO_PAGAMENTO').map((record) => ({
    kind: 'payment', id: `payment-${record.id}`, record,
    title: `${record.area}, ${shortDate(record.date)}${record.fee ? `, ${record.fee}` : ''}`,
    subtitle: [record.resident, unitLabel(record)].filter(Boolean).join(' · '),
  }))
  const tickets = (data.tickets || []).filter((item) => OPEN_TICKET_STATUSES.includes(item.status)).map((record) => ({
    kind: 'ticket', id: `ticket-${record.id}`, record,
    title: record.title,
    subtitle: [record.location || unitLabel(record), record.openedAt && `aberto em ${record.openedAt}`].filter(Boolean).join(' · '),
  }))
  const notices = (data.notices || []).filter((item) => item.priority === 'URGENTE' && item.status !== 'ENCERRADO' && item.endDate === today).map((record) => ({
    kind: 'notice', id: `notice-${record.id}`, record,
    title: record.title,
    subtitle: 'Comunicado urgente que vence hoje',
  }))
  return [...approvals, ...payments, ...tickets, ...notices]
}

const collectionNames = { packages: 'as encomendas', reservations: 'as reservas', tickets: 'os chamados', notices: 'os comunicados', visitors: 'as visitas', units: 'as unidades' }

// Com a API ligada: se alguma coleção do painel ainda está carregando ou falhou (sem API, nada carrega)
export function loadState(remote, keys) {
  return {
    loading: keys.some((key) => remote?.[key]?.status === 'loading'),
    errors: keys.filter((key) => remote?.[key]?.status === 'error').map((key) => ({ key, message: `Não foi possível carregar ${collectionNames[key] || 'os dados'}.` })),
  }
}

// Reservas que acontecem hoje (inclusive as que começaram ontem e passam da meia-noite)
export function todaysReservations(data, now = new Date()) {
  const today = todayIso(now)
  return (data.reservations || [])
    .filter((item) => !INACTIVE_RESERVATION.includes(item.status) && (item.date === today || (item.endDate && item.date < today && item.endDate >= today)))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
}
