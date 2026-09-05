import { Archive, Bell, Building, CalendarCheck, CircleGauge, ClipboardClock, Contact, Headphones, History, LogOut, Megaphone, Package, Settings, UserRound, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Brand from '../components/Brand'

const adminLinks = [
  ['Visão geral', '/admin', CircleGauge], ['Moradores', '/admin/moradores', UsersRound], ['Unidades', '/admin/unidades', Building], ['Encomendas', '/admin/encomendas', Package], ['Reservas', '/admin/reservas', CalendarCheck], ['Visitantes', '/admin/visitantes', Contact], ['Comunicados', '/admin/comunicados', Megaphone], ['Chamados', '/admin/chamados', Headphones],
]
const portariaLinks = [
  ['Visão geral', '/portaria', CircleGauge], ['Visitantes', '/portaria/visitantes', UsersRound], ['Prestadores', '/portaria/prestadores', ClipboardClock], ['Encomendas', '/portaria/encomendas', Archive], ['Avisos', '/portaria/avisos', Megaphone], ['Chamados', '/portaria/chamados', Headphones], ['Histórico', '/portaria/historico', History],
]

export default function DesktopLayout({ role, children }) {
  const links = role === 'admin' ? adminLinks : portariaLinks
  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <Brand inverse />
        <nav>{links.map(([label, to, Icon]) => <NavLink to={to} end={to === `/${role}`} key={to}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar__bottom"><button><Settings size={20} />Configurações</button><NavLink to="/"><LogOut size={20} />Sair</NavLink></div>
      </aside>
      <section className="desktop-main">
        <header><strong>Condomínio Parque das Flores</strong><div><Bell size={21} /><span className="avatar"><UserRound size={18} /></span></div></header>
        <main>{children}</main>
      </section>
    </div>
  )
}
