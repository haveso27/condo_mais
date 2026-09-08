import { AlertTriangle, BellRing, CalendarDays, Package, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'
import ResidentLayout from '../../layouts/ResidentLayout'

export default function ResidentDashboard() {
  const navigate = useNavigate()
  const { data } = useAppData()
  const resident = data.currentResident
  const packageCount = data.packages.filter((item) => item.unit === resident.unit && item.status === 'AGUARDANDO_RETIRADA').length
  const visitorCount = data.visitors.filter((item) => item.unit === resident.unit && ['AUTORIZADO', 'ENTROU'].includes(item.status)).length
  const noticeCount = data.notices.filter((item) => item.status === 'ATIVO' && (item.destination === 'Todo condomínio' || item.tower === resident.tower)).length
  const nextReservation = data.reservations.find((item) => item.unit === resident.unit && item.status === 'CONFIRMADA')
  return (
    <ResidentLayout>
      <section className="resident-page resident-page--dashboard">
        <h1>Olá, {resident.name.split(' ')[0]}! <span>👋</span></h1>
        <p className="muted">Apartamento {resident.unit} · {resident.tower}</p>
        <button className="urgent-alert" onClick={() => navigate('/morador/comunicados/agua')}><AlertTriangle /><span><small>Aviso urgente</small><strong>Interrupção no abastecimento de água na Torre B.</strong><em>Ver detalhes →</em></span></button>
        <h2>Resumo</h2>
        <div className="resident-stats">
          <button onClick={() => navigate('/morador/comunicados')}><Package /><span><small>Encomendas</small><strong>{packageCount}</strong><em>aguardando</em></span></button>
          <button onClick={() => navigate('/morador/reservas')}><CalendarDays /><span><small>Próxima reserva</small><strong>{nextReservation ? `${nextReservation.date.slice(8, 10)}/${nextReservation.date.slice(5, 7)} · ${nextReservation.startTime}` : 'Nenhuma'}</strong><em>{nextReservation?.area || 'Sem reserva'}</em></span></button>
          <button onClick={() => navigate('/morador/visitantes')}><UsersRound /><span><small>Visitantes</small><strong>{visitorCount}</strong><em>autorizado(s) para hoje</em></span></button>
          <button onClick={() => navigate('/morador/comunicados')}><BellRing /><span><small>Avisos</small><strong>{noticeCount}</strong><em>avisos ativos</em></span></button>
        </div>
        <h2>Ações rápidas</h2>
        <div className="quick-actions"><button onClick={() => navigate('/morador/visitantes')}>+ Autorizar visitante</button><button onClick={() => navigate('/morador/reservas')}>+ Fazer reserva</button></div>
        <h2>Últimos avisos</h2>
        <div className="notice-list"><button onClick={() => navigate('/morador/comunicados')}><i className="dot green" /><span><strong>Manutenção preventiva da piscina</strong><small>Hoje · Normal</small></span><b>›</b></button><button onClick={() => navigate('/morador/comunicados/agua')}><i className="dot red" /><span><strong>Interrupção no abastecimento de água</strong><small>Hoje · Urgente</small></span><b>›</b></button></div>
        <button className="text-link inline-link" onClick={() => navigate('/morador/comunicados')}>Ver todos os avisos →</button>
      </section>
    </ResidentLayout>
  )
}
