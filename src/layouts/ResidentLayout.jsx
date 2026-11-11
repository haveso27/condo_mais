import { Bell, CircleGauge, CircleUserRound, Home, Menu, MessageSquareText } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AssistantChat from '../components/AssistantChat'
import Brand from '../components/Brand'
import { apiEnabled } from '../services/api.js'
import { useOptionalAppData } from '../context/AppDataContext'

const links = [
  { to: '/morador', label: 'Início', icon: Home },
  { to: '/morador/comunicados', label: 'Comunicados', icon: MessageSquareText },
  { to: '/morador/mais', label: 'Mais', desktopLabel: 'Serviços', icon: Menu },
  { to: '/morador/perfil', label: 'Meu perfil', icon: CircleUserRound },
]

export default function ResidentLayout({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // O síndico que também mora no condomínio volta para a visão de administrador
  const adminView = useOptionalAppData()?.data.currentResident.profile === 'ADMIN'
  const servicesActive = ['/morador/mais', '/morador/reservas', '/morador/visitantes', '/morador/chamados', '/morador/aprovacoes'].some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const isCurrent = (to) => to === '/morador/mais' ? servicesActive : pathname === to || (to !== '/morador' && pathname.startsWith(`${to}/`))
  return (
    <div className="resident-shell">
      <header className="resident-header">
        <Brand inverse compact />
        <nav className="resident-desktop-nav" aria-label="Navegação principal">{links.map(({ to, label, desktopLabel, icon: Icon }) => <Link to={to} key={to} className={isCurrent(to) ? 'active' : ''} aria-current={isCurrent(to) ? 'page' : undefined}><Icon size={18} /><span>{desktopLabel || label}</span></Link>)}</nav>
        <div className="resident-header__actions">{adminView && <button className="resident-switch" aria-label="Visão administrador" onClick={() => navigate('/admin')}><CircleGauge size={18} /><span>Visão administrador</span></button>}<button aria-label="Ver comunicados" onClick={() => navigate('/morador/comunicados')}><Bell size={20} /></button><button aria-label="Abrir meu perfil" onClick={() => navigate('/morador/perfil')}><CircleUserRound size={22} /></button></div>
      </header>
      <main>{children}</main>
      {apiEnabled() && !adminView && <AssistantChat />}
      <nav className="resident-nav" aria-label="Navegação principal">{links.map(({ to, label, icon: Icon }) => <Link to={to} key={to} className={isCurrent(to) ? 'active' : ''} aria-current={isCurrent(to) ? 'page' : undefined}><Icon size={20} /><span>{label}</span></Link>)}</nav>
    </div>
  )
}
