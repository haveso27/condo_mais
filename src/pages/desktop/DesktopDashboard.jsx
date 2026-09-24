import { Archive, Building2, CalendarCheck, Contact, Headphones, Package, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import DesktopLayout from '../../layouts/DesktopLayout'
import { futureReservations, statusLabel, todayIso } from '../../services/serviceUtils'
import { visitorEffectiveStatus } from '../../services/visitantesService'

function Row({ icon: Icon, title, subtitle, meta, tone = 'green', badge, status }) {
  return <div className="activity-row"><span className={`row-icon row-icon--${tone}`}><Icon size={19} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><span className="row-meta">{meta}{badge && <StatusBadge status={status} tone={tone}>{badge}</StatusBadge>}</span></div>
}

export default function DesktopDashboard({ role }) {
  const navigate = useNavigate()
  const { data } = useAppData()
  const portaria = role === 'portaria'
  const pendingPackages = data.packages.filter((item) => item.status === 'AGUARDANDO_RETIRADA').length
  const presentVisitors = data.visitors.filter((item) => item.status === 'ENTROU').length
  const presentProviders = data.providers.filter((item) => item.status === 'ENTROU').length
  const today = todayIso()
  const todaysVisitors = data.visitors.filter((item) => item.startDate <= today && item.endDate >= today).map((item) => ({ ...item, status: visitorEffectiveStatus(item) }))
  const expectedVisitors = todaysVisitors.filter((item) => ['PENDENTE', 'AUTORIZADO'].includes(item.status)).length
  const upcoming = futureReservations(data.reservations)
  const activeTickets = data.tickets.filter((item) => !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(item.status)).length
  const urgentTickets = data.tickets.filter((item) => ['ALTA', 'URGENTE'].includes(item.priority) && !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(item.status)).length
  return (
    <DesktopLayout role={role}>
      <section className="dashboard-page">
        <h1>Olá, {portaria ? 'João' : 'Administrador'}!</h1>
        <p>Confira {portaria ? 'as atividades da portaria hoje' : 'o que está acontecendo no condomínio hoje'}.</p>
        <div className={`stat-grid${portaria ? ' stat-grid--portaria' : ''}`}>
          {(portaria ? [
            [CalendarCheck, 'Visitantes previstos', String(expectedVisitors), 'para hoje', 'violet'], [UsersRound, 'Visitantes presentes', String(presentVisitors), 'no condomínio', 'green'], [Archive, 'Encomendas', String(pendingPackages), 'aguardando retirada', 'pink'], [Contact, 'Prestadores presentes', String(presentProviders), 'no condomínio', 'green'], [Headphones, 'Chamados urgentes', String(urgentTickets), 'aguardando atenção', 'red', () => navigate('/portaria/chamados')],
          ] : [
            [Building2, 'Unidades', String(data.units.length), `${data.units.filter((item) => item.status === 'OCUPADO').length} ocupadas`, 'violet'], [Package, 'Encomendas', String(pendingPackages), 'aguardando retirada', 'pink'], [CalendarCheck, 'Reservas', String(data.reservations.filter((item) => item.status === 'CONFIRMADA').length), 'confirmadas', 'green'], [Headphones, 'Chamados', String(activeTickets), 'em aberto', 'red'],
          ]).map(([icon, label, value, detail, tone, onClick]) => <StatCard key={label} icon={icon} label={label} value={value} detail={detail} tone={tone} onClick={onClick} />)}
        </div>
        {portaria && <><h2 className="eyebrow">Ações rápidas</h2><div className="desktop-actions"><button onClick={() => navigate('/portaria/visitantes')}>+ Registrar visitante</button><button onClick={() => navigate('/portaria/encomendas')}>+ Registrar encomenda</button><button onClick={() => navigate('/portaria/prestadores')}>+ Registrar prestador</button></div></>}
        <div className="dashboard-columns">
          <article className="panel"><h2>{portaria ? 'Visitantes de hoje' : 'Atividades recentes'}</h2>{portaria
            ? todaysVisitors.slice(0, 3).map((item) => <Row key={item.id} icon={Contact} title={item.name} subtitle={`${item.unit} · ${item.tower}, Responsável: ${item.resident}`} meta={item.startTime} status={item.status} badge={statusLabel(item.status)} tone={['RECUSADO', 'EXPIRADO'].includes(item.status) ? 'red' : 'green'} />)
            : data.history.slice(0, 3).map((item) => <Row key={item.id} icon={Contact} title={item.type} subtitle={item.reference} meta={`${item.date} · ${item.time}`} />)}
            {(portaria ? !todaysVisitors.length : !data.history.length) && <p className="dashboard-empty">Nenhuma atividade encontrada.</p>}</article>
          <article className="panel"><h2>{portaria ? 'Encomendas aguardando retirada' : 'Próximas reservas'}</h2>{portaria
            ? data.packages.filter((item) => item.status === 'AGUARDANDO_RETIRADA').slice(0, 3).map((item) => <Row key={item.id} icon={Archive} title={item.id} subtitle={`${item.resident}, ${item.unit} · ${item.tower}`} meta={item.receivedAt} status={item.status} badge={statusLabel(item.status)} tone="pink" />)
            : upcoming.slice(0, 3).map((item) => <Row key={item.id} icon={CalendarCheck} title={item.area} subtitle={`${item.resident} · ${item.unit} · ${item.tower}`} meta={`${item.date} · ${item.startTime}`} status={item.status} badge={statusLabel(item.status)} />)}
            {(portaria ? !pendingPackages : !upcoming.length) && <p className="dashboard-empty">{portaria ? 'Nenhuma encomenda aguardando retirada.' : 'Nenhuma reserva futura.'}</p>}</article>
          <article className="panel"><h2>{portaria ? 'Prestadores presentes' : 'Chamados em aberto'}</h2>{portaria
            ? data.providers.filter((item) => item.status === 'ENTROU').slice(0, 3).map((item) => <Row key={item.id} icon={Contact} title={item.name} subtitle={`${item.service}, ${item.location} · ${item.tower}`} meta={item.entryAt} status={item.status} badge={statusLabel(item.status)} />)
            : data.tickets.filter((item) => !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(item.status)).slice(0, 3).map((item) => <Row key={item.id} icon={Headphones} title={item.title} subtitle={item.id} meta={statusLabel(item.status)} status={item.priority} badge={statusLabel(item.priority)} tone={['ALTA', 'URGENTE'].includes(item.priority) ? 'red' : 'green'} />)}
            {(portaria ? !presentProviders : !activeTickets) && <p className="dashboard-empty">Nenhum registro no momento.</p>}</article>
        </div>
      </section>
    </DesktopLayout>
  )
}
