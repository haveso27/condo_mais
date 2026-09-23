import { Archive, Building2, CalendarCheck, Contact, Headphones, Package, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import DesktopLayout from '../../layouts/DesktopLayout'
import { visitorEffectiveStatus } from '../../services/visitantesService'

function Row({ icon: Icon, title, subtitle, meta, tone = 'green', badge }) {
  return <div className="activity-row"><span className={`row-icon row-icon--${tone}`}><Icon size={19} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><span className="row-meta">{meta}{badge && <StatusBadge tone={tone}>{badge}</StatusBadge>}</span></div>
}

export default function DesktopDashboard({ role }) {
  const navigate = useNavigate()
  const { data } = useAppData()
  const portaria = role === 'portaria'
  const pendingPackages = data.packages.filter((item) => item.status === 'AGUARDANDO_RETIRADA').length
  const presentVisitors = data.visitors.filter((item) => item.status === 'ENTROU').length
  const presentProviders = data.providers.filter((item) => item.status === 'ENTROU').length
  const expectedVisitors = data.visitors.filter((item) => ['PENDENTE', 'AUTORIZADO'].includes(visitorEffectiveStatus(item))).length
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
          <article className="panel"><h2>{portaria ? 'Visitantes de hoje' : 'Atividades recentes'}</h2><Row icon={Contact} title={portaria ? 'Mariana Souza' : 'Nova encomenda recebida'} subtitle={portaria ? '203 · Torre A, Responsável: Carlos Silva' : 'Apto 203 · Torre A'} meta={portaria ? '14:30' : '14:32'} badge={portaria ? 'Autorizado' : ''} /><Row icon={Contact} title={portaria ? 'Lucas Oliveira' : 'Nova reserva realizada'} subtitle={portaria ? '305 · Torre B' : 'Salão de Festas · Apto. 305'} meta={portaria ? '16:00' : '13:10'} badge={portaria ? 'Em visita' : ''} /><Row icon={Headphones} title={portaria ? 'Camila Ferreira' : 'Novo chamado aberto'} subtitle={portaria ? '402 · Torre C' : 'Vazamento na garagem'} meta={portaria ? '18:30' : '11:48'} badge={portaria ? 'Autorizado' : ''} /></article>
          <article className="panel"><h2>{portaria ? 'Encomendas aguardando retirada' : 'Próximas reservas'}</h2><Row icon={portaria ? Archive : CalendarCheck} title={portaria ? 'ENC-1048' : 'Salão de Festas'} subtitle={portaria ? 'Carlos Silva, 203 · Torre A' : 'Hoje 18:00'} meta={portaria ? 'Hoje · 14:32' : ''} badge={portaria ? 'Aguardando retirada' : ''} tone={portaria ? 'pink' : 'green'} /><Row icon={portaria ? Archive : CalendarCheck} title={portaria ? 'ENC-1047' : 'Churrasqueira'} subtitle={portaria ? 'Ana Souza, 305 · Torre B' : 'Amanhã 12:00'} meta={portaria ? 'Hoje · 12:18' : ''} badge={portaria ? 'Aguardando retirada' : ''} tone={portaria ? 'pink' : 'green'} /></article>
          <article className="panel"><h2>{portaria ? 'Prestadores presentes' : 'Chamados em aberto'}</h2><Row icon={portaria ? Contact : Headphones} title={portaria ? 'José Almeida' : 'Vazamento na garagem'} subtitle={portaria ? 'Eletricista, 305 · Torre B' : '#CH-0028'} meta={portaria ? 'Entrada · 09:15' : ''} badge={portaria ? 'Presente' : 'Urgente'} tone={portaria ? 'green' : 'red'} /><Row icon={portaria ? Contact : Headphones} title={portaria ? 'Marcos Santos' : 'Portão com problema'} subtitle={portaria ? 'Manutenção hidráulica, Área comum' : '#CH-0026'} meta={portaria ? 'Entrada · 10:40' : ''} badge={portaria ? 'Presente' : 'Alta'} tone={portaria ? 'green' : 'red'} /></article>
        </div>
      </section>
    </DesktopLayout>
  )
}
