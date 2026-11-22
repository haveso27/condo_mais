import DesktopLayout from '../../layouts/DesktopLayout'
import AdminToday from './AdminToday'
import PortariaBalcao from './PortariaBalcao'

// Tela inicial de cada perfil: "Hoje" para a administração e "Balcão" para a portaria
export default function DesktopDashboard({ role }) {
  return <DesktopLayout role={role}>{role === 'portaria' ? <PortariaBalcao /> : <AdminToday />}</DesktopLayout>
}
