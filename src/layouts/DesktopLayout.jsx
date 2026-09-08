import { Archive, Bell, Building, CalendarCheck, CircleGauge, ClipboardClock, Contact, Headphones, History, LogOut, Megaphone, Package, Settings, UserRound, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import Brand from '../components/Brand'
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
  const flash = (message) => { setFeedback(message); setTimeout(() => setFeedback(''), 2200) }
  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <Brand inverse />
        <nav>{links.map(([label, to, Icon]) => <NavLink to={to} end={to === `/${role}`} key={to}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar__bottom">{role === 'admin' && <NavLink to="/admin/configuracoes"><Settings size={20} />Configurações</NavLink>}<NavLink to="/"><LogOut size={20} />Sair</NavLink></div>
      </aside>
      <section className="desktop-main">
        <header><strong>{data.condominium.name}</strong><div><button className="header-icon" aria-label="Notificações" onClick={() => flash('Nenhuma nova notificação para este perfil.')}><Bell size={21} /></button><button className="avatar" aria-label="Perfil do usuário" onClick={() => flash(role === 'admin' ? 'Perfil: Administrador' : 'Perfil: João · Portaria')}><UserRound size={18} /></button></div></header>
        <main>{children}</main>
      </section>
      {feedback && <div className="toast">{feedback}</div>}
    </div>
  )
}
