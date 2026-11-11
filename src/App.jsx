import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import AuthFlowPage from './pages/auth/AuthFlowPage'
import ResidentDashboard from './pages/morador/ResidentDashboard'
import DesktopDashboard from './pages/desktop/DesktopDashboard'
import EntityPage from './pages/desktop/EntityPage'
import AdminSettingsPage from './pages/desktop/AdminSettingsPage'
import VerticalSetupWizardPage from './pages/desktop/VerticalSetupWizardExperience'
import NewTowersWizard from './pages/desktop/NewTowersWizard'
import AdminSetupAccessGate from './components/AdminSetupAccessGate'
import SessionAccessGate from './components/SessionAccessGate'
import { SESSION_AREA } from './features/session/sessionAccess'
import { PlatformDataProvider } from './context/PlatformDataContext'
import PlatformLayout from './layouts/PlatformLayout'
import PlatformDashboardPage from './pages/platform/PlatformDashboardPage'
import PlatformCondominiumsPage from './pages/platform/PlatformCondominiumsPage'
import PlatformCondominiumDetailPage from './pages/platform/PlatformCondominiumDetailPage'
import PlatformCondominiumCreatePage from './pages/platform/PlatformCondominiumCreatePage'
import PlatformCondominiumEditPage from './pages/platform/PlatformCondominiumEditPage'
import { CommunicationDetail, CommunicationsPage, MorePage, ProfilePage, ResidentListPage } from './pages/morador/ResidentPages'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/primeiro-acesso" element={<AuthFlowPage step="first" />} />
      <Route path="/criar-senha" element={<AuthFlowPage step="create" />} />
      <Route path="/recuperar-senha" element={<AuthFlowPage step="recovery1" />} />
      <Route path="/recuperar-senha/verificar" element={<AuthFlowPage step="recovery2" />} />
      <Route path="/recuperar-senha/nova-senha" element={<AuthFlowPage step="recovery3" />} />
      <Route element={<SessionAccessGate area={SESSION_AREA.MORADOR} />}>
        <Route path="/morador" element={<ResidentDashboard />} />
        <Route path="/morador/comunicados" element={<CommunicationsPage />} />
        <Route path="/morador/comunicados/:id" element={<CommunicationDetail />} />
        <Route path="/morador/mais" element={<MorePage />} />
        <Route path="/morador/reservas" element={<ResidentListPage type="reservas" />} />
        <Route path="/morador/visitantes" element={<ResidentListPage type="visitantes" />} />
        <Route path="/morador/chamados" element={<ResidentListPage type="chamados" />} />
        <Route path="/morador/aprovacoes" element={<ResidentListPage type="aprovacoes" />} />
        <Route path="/morador/perfil" element={<ProfilePage />} />
      </Route>
      <Route element={<SessionAccessGate area={SESSION_AREA.PORTARIA} />}>
        <Route path="/portaria" element={<DesktopDashboard role="portaria" />} />
        <Route path="/portaria/visitantes" element={<EntityPage role="portaria" type="visitantesPortaria" />} />
        <Route path="/portaria/prestadores" element={<EntityPage role="portaria" type="prestadores" />} />
        <Route path="/portaria/encomendas" element={<EntityPage role="portaria" type="encomendasPortaria" />} />
        <Route path="/portaria/avisos" element={<EntityPage role="portaria" type="avisos" />} />
        <Route path="/portaria/historico" element={<EntityPage role="portaria" type="historico" />} />
      </Route>
      <Route element={<SessionAccessGate area={SESSION_AREA.ADMIN} />}>
        <Route path="/admin" element={<DesktopDashboard role="admin" />} />
        <Route path="/admin/moradores" element={<EntityPage role="admin" type="moradores" />} />
        <Route path="/admin/equipe" element={<EntityPage role="admin" type="equipe" />} />
        <Route path="/admin/unidades" element={<EntityPage role="admin" type="unidades" />} />
        <Route path="/admin/torres/novas" element={<NewTowersWizard />} />
        <Route path="/admin/encomendas" element={<EntityPage role="admin" type="encomendasAdmin" />} />
        <Route path="/admin/reservas" element={<EntityPage role="admin" type="reservas" />} />
        <Route path="/admin/areas-comuns" element={<EntityPage role="admin" type="areasComuns" />} />
        <Route path="/admin/visitantes" element={<EntityPage role="admin" type="visitantesAdmin" />} />
        <Route path="/admin/comunicados" element={<EntityPage role="admin" type="comunicados" />} />
        <Route path="/admin/chamados" element={<EntityPage role="admin" type="chamadosAdmin" />} />
        <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
      </Route>
      <Route path="/admin/configuracao-inicial" element={<AdminSetupAccessGate><VerticalSetupWizardPage /></AdminSetupAccessGate>} />
      <Route element={<SessionAccessGate area={SESSION_AREA.PLATFORM} />}>
        <Route element={<PlatformDataProvider><PlatformLayout /></PlatformDataProvider>}>
          <Route path="/plataforma" element={<PlatformDashboardPage />} />
          <Route path="/plataforma/condominios" element={<PlatformCondominiumsPage />} />
          <Route path="/plataforma/condominios/novo" element={<PlatformCondominiumCreatePage />} />
          <Route path="/plataforma/condominios/:id/editar" element={<PlatformCondominiumEditPage />} />
          <Route path="/plataforma/condominios/:id" element={<PlatformCondominiumDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
