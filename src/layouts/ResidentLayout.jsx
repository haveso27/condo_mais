import { Bell, CircleUserRound, Home, Menu, MessageSquareText } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'

const links = [
  { to: '/morador', label: 'Início', icon: Home },
  { to: '/morador/comunicados', label: 'Comunicados', icon: MessageSquareText },
  { to: '/morador/mais', label: 'Mais', desktopLabel: 'Serviços', icon: Menu },
  { to: '/morador/perfil', label: 'Meu perfil', icon: CircleUserRound },
]

export default function ResidentLayout({ children }) {
  const navigate = useNavigate()
  return (
    <div className="resident-shell">
      <header className="resident-header">
        <Brand inverse compact />
        <nav className="resident-desktop-nav">{links.map(({ to, label, desktopLabel, icon: Icon }) => <NavLink to={to} end={to === '/morador'} key={to}><Icon size={18} /><span>{desktopLabel || label}</span></NavLink>)}</nav>
        <div className="resident-header__actions"><button aria-label="Ver comunicados" onClick={() => navigate('/morador/comunicados')}><Bell size={20} /></button><button aria-label="Abrir meu perfil" onClick={() => navigate('/morador/perfil')}><CircleUserRound size={22} /></button></div>
      </header>
      <main>{children}</main>
      <nav className="resident-nav">{links.map(({ to, label, icon: Icon }) => <NavLink to={to} end={to === '/morador'} key={to}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    </div>
  )
}
