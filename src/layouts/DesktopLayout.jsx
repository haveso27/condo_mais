import { Archive, Bell, Building, CalendarCheck, Trees, ClipboardClock, Contact, Headphones, History, Home, LogOut, Menu, Megaphone, Package, Settings, UserCog, UserRound, UsersRound, ConciergeBell } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Fragment, useState } from 'react'
import Brand from '../components/Brand'
import Modal from '../components/Modal'
import Selo from '../components/Selo'
import { useAppData } from '../context/AppDataContext'
import { logout } from '../services/authApi'
import { navigationCounts, todayLabel } from '../features/dashboard/dashboardData'

// Menu dividido em "Dia a dia" (o que acontece hoje) e "Cadastro" (estrutura); o +N mostra onde há novidade
const adminGroups = [
  ['Dia a dia', [['Hoje', '/admin', Home], ['Encomendas', '/admin/encomendas', Package, 'packages'], ['Visitantes', '/admin/visitantes', Contact], ['Reservas', '/admin/reservas', CalendarCheck, 'reservations'], ['Chamados', '/admin/chamados', Headphones, 'tickets'], ['Comunicados', '/admin/comunicados', Megaphone]]],
  ['Cadastro', [['Unidades', '/admin/unidades', Building], ['Moradores', '/admin/moradores', UsersRound], ['Equipe', '/admin/equipe', UserCog], ['Áreas comuns', '/admin/areas-comuns', Trees]]],
]
const portariaGroups = [
  ['Portaria', [['Balcão', '/portaria', ConciergeBell], ['Visitantes', '/portaria/visitantes', UsersRound, 'visitors'], ['Encomendas', '/portaria/encomendas', Archive, 'packages'], ['Prestadores', '/portaria/prestadores', ClipboardClock], ['Avisos', '/portaria/avisos', Megaphone], ['Histórico', '/portaria/historico', History]]],
]
const countLabels = { packages: 'aguardando retirada', reservations: 'pedem sua ação', tickets: 'abertos', visitors: 'aguardando autorização' }

function linkLabel(label, count, key) {
  return count ? `${label} (${count} ${countLabels[key]})` : label
}

export default function DesktopLayout({ role, children }) {
  const groups = role === 'admin' ? adminGroups : portariaGroups
  const { data } = useAppData()
  const counts = navigationCounts(data)
  const [feedback, setFeedback] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  // O síndico que também mora no condomínio alterna para a visão de morador
  const residentView = role === 'admin' && Boolean(data.currentResident.unitId)
  const flash = (message) => { setFeedback(message); setTimeout(() => setFeedback(''), 2200) }
  return (
    <div className="desktop-shell">
      <aside className="sidebar">
        <Brand inverse />
        <button className="compact-menu-button" aria-expanded={menuOpen} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><Menu size={22} /> Menu</button>
        <nav aria-label="Menu principal">{groups.map(([group, links]) => <Fragment key={group}><div className="sidebar__grupo">{group}</div>{links.map(([label, to, Icon, countKey]) => {
          const count = countKey ? counts[countKey] : 0
          return <NavLink aria-label={linkLabel(label, count, countKey)} title={label} to={to} end={to === `/${role}`} key={to}><Icon size={19} /><span>{label}</span>{count > 0 && <span className="nav-count" aria-hidden="true">+{count}</span>}</NavLink>
        })}</Fragment>)}</nav>
        <div className="sidebar__bottom">{residentView && <NavLink aria-label="Visão morador" title="Visão morador" to="/morador"><Home size={19} />Visão morador</NavLink>}{role === 'admin' && <NavLink aria-label="Configurações" title="Configurações" to="/admin/configuracoes"><Settings size={19} />Configurações</NavLink>}<NavLink aria-label="Sair" title="Sair" to="/" onClick={logout}><LogOut size={19} />Sair</NavLink></div>
      </aside>
      <section className="desktop-main">
        <header><strong>{data.condominium.name}<small>{todayLabel()}</small></strong><div><button className="header-icon" aria-label="Notificações" onClick={() => flash('Nenhuma nova notificação para este perfil.')}><Bell size={20} /></button><button className="avatar" aria-label="Perfil do usuário" onClick={() => flash(role === 'admin' ? 'Perfil: Administrador' : 'Perfil: João · Portaria')}><UserRound size={18} /></button></div></header>
        <main>{children}</main>
      </section>
      <div className="compact-navigation"><Modal open={menuOpen} title={role === 'admin' ? 'Menu da Administração' : 'Menu da Portaria'} onClose={() => setMenuOpen(false)}>
        <nav aria-label="Menu principal">{groups.map(([group, links]) => <Fragment key={group}><div className="compact-group">{group}</div>{links.map(([label, to, Icon, countKey]) => {
          const count = countKey ? counts[countKey] : 0
          return <NavLink to={to} end={to === `/${role}`} key={to} onClick={() => setMenuOpen(false)}><Icon size={19} />{label}<Selo count={count} label={`${count} ${countLabels[countKey] || ''}`.trim()} /></NavLink>
        })}</Fragment>)}
          {residentView && <NavLink to="/morador" onClick={() => setMenuOpen(false)}><Home size={19} />Visão morador</NavLink>}
          {role === 'admin' && <NavLink to="/admin/configuracoes" onClick={() => setMenuOpen(false)}><Settings size={19} />Configurações</NavLink>}
          {role === 'portaria' && <><button onClick={() => { setMenuOpen(false); flash('Nenhuma nova notificação para este perfil.') }}><Bell size={19} />Notificações</button><button onClick={() => { setMenuOpen(false); flash('Perfil: João · Portaria') }}><UserRound size={19} />Meu perfil</button></>}
          <NavLink to="/" onClick={() => { logout(); setMenuOpen(false) }}><LogOut size={19} />Sair</NavLink>
        </nav>
      </Modal></div>
      <div role="status" aria-live="polite" aria-atomic="true">{feedback && <div className="toast">{feedback}</div>}</div>
    </div>
  )
}
