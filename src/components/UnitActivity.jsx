import { CalendarDays, Headphones, Package, UserRound } from 'lucide-react'
import { unitActivity, unitKey } from '../features/facade/facadeData'
import { futureReservations, sameUnit } from '../services/serviceUtils'
import { shortDate } from '../features/dashboard/dashboardData'

const icons = { package: Package, reservation: CalendarDays, ticket: Headphones, visitor: UserRound }

function describe({ kind, record }) {
  if (kind === 'package') return [`Encomenda ${record.code || ''} na portaria`.replace('  ', ' '), record.receivedAt ? `Desde ${record.receivedAt}` : '']
  if (kind === 'reservation') return [`${record.area} ${record.status === 'AGUARDANDO_PAGAMENTO' ? 'aguardando pagamento' : 'para aprovar'}`, `${shortDate(record.date)}, ${record.startTime} às ${record.endTime}`]
  if (kind === 'ticket') return [`Chamado aberto: ${record.title}`, record.openedAt || '']
  return [`Visita aguardando autorização: ${record.name}`, `${shortDate(record.startDate)}, ${record.startTime} às ${record.endTime}`]
}

// Ficha da unidade: o que está acontecendo agora e as próximas reservas
export default function UnitActivity({ unit, data }) {
  const now = (unitActivity(data).get(unitKey(unit.tower, unit.number)) || [])
  const upcoming = futureReservations((data.reservations || []).filter((item) => sameUnit(item, { tower: unit.tower, unit: unit.number }))).slice(0, 3)
  return <div className="ficha-extra">
    <h3>Agora</h3>
    {now.length ? <ul className="agora-lista">{now.map((item) => { const Icon = icons[item.kind]; const [title, detail] = describe(item); return <li key={`${item.kind}-${item.record.id}`}><span className="selo" aria-hidden="true">+</span><Icon size={16} aria-hidden="true" /><span><strong>{title}</strong>{detail && <small>{detail}</small>}</span></li> })}</ul> : <p className="muted">Nada pendente nesta unidade.</p>}
    <h3>Próximas reservas</h3>
    {upcoming.length ? <ul className="agora-lista">{upcoming.map((item) => <li key={item.id}><CalendarDays size={16} aria-hidden="true" /><span><strong>{item.area}, {shortDate(item.date)}</strong><small>{item.startTime} às {item.endTime}{item.resident ? `, ${item.resident}` : ''}</small></span></li>)}</ul> : <p className="muted">Nenhuma reserva confirmada.</p>}
  </div>
}
