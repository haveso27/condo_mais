import { Bell, CircleUserRound, Home, Menu, MessageSquareText } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Brand from '../components/Brand'

const links = [
  { to: '/morador', label: 'Início', icon: Home },
  { to: '/morador/comunicados', label: 'Comunicados', icon: MessageSquareText },
  { to: '/morador/mais', label: 'Mais', icon: Menu },
  { to: '/morador/perfil', label: 'Meu perfil', icon: CircleUserRound },
]

export default function ResidentLayout({ children }) {
  return (
    <div className="resident-shell">
      <header className="resident-header"><Brand inverse compact /><div><Bell size={20} /><CircleUserRound size={22} /></div></header>
      <main>{children}</main>
      <nav className="resident-nav">{links.map(({ to, label, icon: Icon }) => <NavLink to={to} end={to === '/morador'} key={to}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    </div>
  )
}
