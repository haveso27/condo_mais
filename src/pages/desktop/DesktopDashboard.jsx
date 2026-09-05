import { Archive, Building2, CalendarCheck, Contact, Headphones, Package, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import DesktopLayout from '../../layouts/DesktopLayout'

function Row({ icon: Icon, title, subtitle, meta, tone = 'green', badge }) {
  return <div className="activity-row"><span className={`row-icon row-icon--${tone}`}><Icon size={19} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><span className="row-meta">{meta}{badge && <StatusBadge tone={tone}>{badge}</StatusBadge>}</span></div>
}

export default function DesktopDashboard({ role }) {
  const navigate = useNavigate()
  const portaria = role === 'portaria'
  return (
    <DesktopLayout role={role}>
      <section className="dashboard-page">
        <h1>Olá, {portaria ? 'João' : 'Administrador'}!</h1>
        <p>Confira {portaria ? 'as atividades da portaria hoje' : 'o que está acontecendo no condomínio hoje'}.</p>
        <div className="stat-grid">
          {(portaria ? [
            [CalendarCheck, 'Visitantes previstos', '8', 'para hoje', 'violet'], [UsersRound, 'Visitantes presentes', '3', 'no condomínio', 'green'], [Archive, 'Encomendas', '6', 'aguardando retirada', 'pink'], [Contact, 'Prestadores presentes', '2', 'no condomínio', 'green'],
          ] : [
            [Building2, 'Unidades', '128', '120 ocupadas', 'violet'], [Package, 'Encomendas', '6', 'aguardando retirada', 'pink'], [CalendarCheck, 'Reservas', '8', 'nos próximos 7 dias', 'green'], [Headphones, 'Chamados', '5', 'em aberto', 'red'],
          ]).map(([icon, label, value, detail, tone]) => <StatCard key={label} icon={icon} label={label} value={value} detail={detail} tone={tone} />)}
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
