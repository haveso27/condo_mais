import { AlertTriangle, BellRing, CalendarDays, Package, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ResidentLayout from '../../layouts/ResidentLayout'

export default function ResidentDashboard() {
  const navigate = useNavigate()
  return (
    <ResidentLayout>
      <section className="resident-page">
        <h1>Olá, Carlos! <span>👋</span></h1>
        <p className="muted">Apartamento 203 · Torre A</p>
        <button className="urgent-alert" onClick={() => navigate('/morador/comunicados/agua')}><AlertTriangle /><span><small>Aviso urgente</small><strong>Interrupção no abastecimento de água na Torre B.</strong><em>Ver detalhes →</em></span></button>
        <h2>Resumo</h2>
        <div className="resident-stats">
          <button><Package /><span><small>Encomendas</small><strong>2</strong><em>aguardando</em></span></button>
          <button onClick={() => navigate('/morador/reservas')}><CalendarDays /><span><small>Próxima reserva</small><strong>15/09 · 18:00</strong><em>Salão de Festas</em></span></button>
          <button onClick={() => navigate('/morador/visitantes')}><UsersRound /><span><small>Visitantes</small><strong>1</strong><em>autorizado para hoje</em></span></button>
          <button onClick={() => navigate('/morador/comunicados')}><BellRing /><span><small>Avisos</small><strong>2</strong><em>novos avisos</em></span></button>
        </div>
        <h2>Ações rápidas</h2>
        <div className="quick-actions"><button onClick={() => navigate('/morador/visitantes')}>+ Autorizar visitante</button><button onClick={() => navigate('/morador/reservas')}>+ Fazer reserva</button></div>
        <h2>Últimos avisos</h2>
        <div className="notice-list"><button><i className="dot green" /><span><strong>Manutenção preventiva da piscina</strong><small>Hoje · Normal</small></span><b>›</b></button><button onClick={() => navigate('/morador/comunicados/agua')}><i className="dot red" /><span><strong>Interrupção no abastecimento de água</strong><small>Hoje · Urgente</small></span><b>›</b></button></div>
        <button className="text-link inline-link" onClick={() => navigate('/morador/comunicados')}>Ver todos os avisos →</button>
      </section>
    </ResidentLayout>
  )
}
