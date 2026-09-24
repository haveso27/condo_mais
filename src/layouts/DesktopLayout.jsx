import { Archive, Bell, Building, CalendarCheck, CircleGauge, ClipboardClock, Contact, Headphones, History, LogOut, Menu, Megaphone, Package, Settings, UserRound, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import Brand from '../components/Brand'
import Modal from '../components/Modal'
import { useAppData } from '../context/AppDataContext'

const adminLinks = [
  ['Visão geral', '/admin', CircleGauge], ['Moradores', '/admin/moradores', UsersRound], ['Unidades', '/admin/unidades', Building], ['Encomendas', '/admin/encomendas', Package], ['Reservas', '/admin/reservas', CalendarCheck], ['Visitantes', '/admin/visitantes', Contact], ['Comunicados', '/admin/comunicados', Megaphone], ['Chamados', '/admin/chamados', Headphones],
]
const portariaLinks = [
  ['Visão geral', '/portaria', CircleGauge], ['Visitantes', '/portaria/visitantes', UsersRound], ['Prestadores', '/portaria/prestadores', ClipboardClock], ['Encomendas', '/portaria/encomendas', Archive], ['Avisos', '/portaria/avisos', Megaphone], ['Chamados', '/portaria/chamados', Headphones], ['Histórico', '/portaria/historico', History],
]

export default function DesktopLayout({ role, children }) {
  const links = role === 'admin' ? adminLinks : portariaLinks
  const { data } = useAppData()
  const [feedback, setFeedback] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const flash = (message) => { setFeedback(message); setTimeout(() => setFeedback(''), 2200) }
  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <Brand inverse />
        <button className="compact-menu-button" aria-expanded={menuOpen} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><Menu size={22} /> Menu</button>
        <nav>{links.map(([label, to, Icon]) => <NavLink aria-label={label} title={label} to={to} end={to === `/${role}`} key={to}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar__bottom">{role === 'admin' && <NavLink aria-label="Configurações" title="Configurações" to="/admin/configuracoes"><Settings size={20} />Configurações</NavLink>}<NavLink aria-label="Sair" title="Sair" to="/"><LogOut size={20} />Sair</NavLink></div>
      </aside>
      <section className="desktop-main">
        <header><strong>{data.condominium.name}</strong><div><button className="header-icon" aria-label="Notificações" onClick={() => flash('Nenhuma nova notificação para este perfil.')}><Bell size={21} /></button><button className="avatar" aria-label="Perfil do usuário" onClick={() => flash(role === 'admin' ? 'Perfil: Administrador' : 'Perfil: João · Portaria')}><UserRound size={18} /></button></div></header>
        <main>{children}</main>
      </section>
      <div className="compact-navigation"><Modal open={menuOpen} title={role === 'admin' ? 'Menu da Administração' : 'Menu da Portaria'} onClose={() => setMenuOpen(false)}>
        <nav aria-label="Menu principal">{links.map(([label, to, Icon]) => <NavLink to={to} end={to === `/${role}`} key={to} onClick={() => setMenuOpen(false)}><Icon size={20} />{label}</NavLink>)}
          {role === 'admin' && <NavLink to="/admin/configuracoes" onClick={() => setMenuOpen(false)}><Settings size={20} />Configurações</NavLink>}
          {role === 'portaria' && <><button onClick={() => { setMenuOpen(false); flash('Nenhuma nova notificação para este perfil.') }}><Bell size={20} />Notificações</button><button onClick={() => { setMenuOpen(false); flash('Perfil: João · Portaria') }}><UserRound size={20} />Meu perfil</button></>}
          <NavLink to="/" onClick={() => setMenuOpen(false)}><LogOut size={20} />Sair</NavLink>
        </nav>
      </Modal></div>
      <div role="status" aria-live="polite" aria-atomic="true">{feedback && <div className="toast">{feedback}</div>}</div>
    </div>
  )
}
