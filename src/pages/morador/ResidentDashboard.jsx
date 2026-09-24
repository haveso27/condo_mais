import { AlertTriangle, BellRing, CalendarDays, Package, Settings2, UsersRound, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/Modal'
import { useAppData } from '../../context/AppDataContext'
import ResidentLayout from '../../layouts/ResidentLayout'
import { sameUnit, futureReservations, activeNotices, statusLabel } from '../../services/serviceUtils'
import { visitorEffectiveStatus } from '../../services/visitantesService'

const dashboardCards = [
  { key: 'packages', label: 'Encomendas' },
  { key: 'reservations', label: 'Reservas' },
  { key: 'visitors', label: 'Visitantes' },
  { key: 'tickets', label: 'Chamados' },
  { key: 'notices', label: 'Avisos' },
]

const defaultCards = dashboardCards.map((item) => item.key)

function loadCards(residentId) {
  try {
    const stored = JSON.parse(localStorage.getItem(`condo-dashboard-cards-${residentId}`))
    return Array.isArray(stored) ? stored.filter((key) => defaultCards.includes(key)) : defaultCards
  } catch {
    return defaultCards
  }
}

export default function ResidentDashboard() {
  const navigate = useNavigate()
  const { data } = useAppData()
  const resident = data.currentResident
  const [visibleCards, setVisibleCards] = useState(() => loadCards(resident.id))
  const [draftCards, setDraftCards] = useState(visibleCards)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const packageCount = data.packages.filter((item) => sameUnit(item, resident) && item.status === 'AGUARDANDO_RETIRADA').length
  const visitorCount = data.visitors.filter((item) => sameUnit(item, resident) && ['AUTORIZADO', 'ENTROU'].includes(visitorEffectiveStatus(item))).length
  const ticketCount = data.tickets.filter((item) => sameUnit(item, resident) && !['RESOLVIDO', 'ENCERRADO', 'CANCELADO'].includes(item.status)).length
  const notices = activeNotices(data.notices, resident)
  const noticeCount = notices.length
  const urgentNotice = notices.find((item) => item.priority === 'URGENTE')
  const nextReservation = futureReservations(data.reservations.filter((item) => sameUnit(item, resident)))[0]
  const cards = [
    { key: 'packages', icon: Package, label: 'Encomendas', value: packageCount, detail: 'aguardando', route: '/morador/comunicados' },
    { key: 'reservations', icon: CalendarDays, label: 'Próxima reserva', value: nextReservation ? `${nextReservation.date.slice(8, 10)}/${nextReservation.date.slice(5, 7)} · ${nextReservation.startTime}` : 'Nenhuma', detail: nextReservation?.area || 'Sem reserva', route: '/morador/reservas' },
    { key: 'visitors', icon: UsersRound, label: 'Visitantes', value: visitorCount, detail: 'autorizado(s) no período', route: '/morador/visitantes' },
    { key: 'tickets', icon: Wrench, label: 'Chamados', value: ticketCount, detail: 'em acompanhamento', route: '/morador/chamados' },
    { key: 'notices', icon: BellRing, label: 'Avisos', value: noticeCount, detail: 'avisos ativos', route: '/morador/comunicados' },
  ]

  function saveCards() {
    setVisibleCards(draftCards)
    try {
      localStorage.setItem(`condo-dashboard-cards-${resident.id}`, JSON.stringify(draftCards))
    } catch {
      // Mantém a personalização durante a sessão quando o navegador bloqueia o armazenamento local.
    }
    setSettingsOpen(false)
  }

  function toggleCard(key) {
    setDraftCards((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }

  return (
    <ResidentLayout>
      <section className="resident-page resident-page--dashboard">
        <h1>Olá, {resident.name.split(' ')[0]}! <span>👋</span></h1>
        <p className="muted">Apartamento {resident.unit} · {resident.tower}</p>
        {urgentNotice && <button className="urgent-alert" onClick={() => navigate(`/morador/comunicados/${encodeURIComponent(urgentNotice.id)}`)}><AlertTriangle /><span><small>Aviso urgente</small><strong>{urgentNotice.title}</strong><em>Ver detalhes →</em></span></button>}
        <div className="dashboard-summary-heading"><h2>Resumo</h2><button className="text-link" onClick={() => { setDraftCards(visibleCards); setSettingsOpen(true) }}><Settings2 size={15} /> Personalizar</button></div>
        <div className="resident-stats">
          {cards.filter((card) => visibleCards.includes(card.key)).map(({ key, icon: Icon, label, value, detail, route }) => <button key={key} onClick={() => navigate(route)}><Icon /><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></button>)}
          {visibleCards.length === 0 && <p className="dashboard-empty">Nenhum card selecionado. Use “Personalizar” para escolher as informações do resumo.</p>}
        </div>
        <h2>Ações rápidas</h2>
        <div className="quick-actions"><button onClick={() => navigate('/morador/visitantes')}>+ Autorizar visitante</button><button onClick={() => navigate('/morador/reservas')}>+ Fazer reserva</button></div>
        <h2>Últimos avisos</h2>
        <div className="notice-list">{notices.slice(0, 3).map((notice) => <button key={notice.id} onClick={() => navigate(`/morador/comunicados/${encodeURIComponent(notice.id)}`)}><i className={`dot ${notice.priority === 'URGENTE' ? 'red' : 'green'}`} /><span><strong>{notice.title}</strong><small>{notice.startDate} · {statusLabel(notice.priority)}</small></span><b>›</b></button>)}{!notices.length && <p className="dashboard-empty">Nenhum aviso ativo.</p>}</div>
        <button className="text-link inline-link" onClick={() => navigate('/morador/comunicados')}>Ver todos os avisos →</button>
      </section>
      <Modal open={settingsOpen} title="Personalizar resumo" onClose={() => setSettingsOpen(false)} onConfirm={saveCards} confirmLabel="Salvar preferências">
        <p className="form-note dashboard-settings-note">Escolha quais informações deseja visualizar no Dashboard.</p>
        <div className="dashboard-card-options">{dashboardCards.map((card) => <label className="form-checkbox" key={card.key}><input type="checkbox" checked={draftCards.includes(card.key)} onChange={() => toggleCard(card.key)} /> {card.label}</label>)}</div>
      </Modal>
    </ResidentLayout>
  )
}
