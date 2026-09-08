import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'
import AuthFlowPage from './pages/auth/AuthFlowPage'
import ResidentDashboard from './pages/morador/ResidentDashboard'
import DesktopDashboard from './pages/desktop/DesktopDashboard'
import EntityPage from './pages/desktop/EntityPage'
import AdminSettingsPage from './pages/desktop/AdminSettingsPage'
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
      <Route path="/morador" element={<ResidentDashboard />} />
      <Route path="/morador/comunicados" element={<CommunicationsPage />} />
      <Route path="/morador/comunicados/agua" element={<CommunicationDetail />} />
      <Route path="/morador/mais" element={<MorePage />} />
      <Route path="/morador/reservas" element={<ResidentListPage type="reservas" />} />
      <Route path="/morador/visitantes" element={<ResidentListPage type="visitantes" />} />
      <Route path="/morador/chamados" element={<ResidentListPage type="chamados" />} />
      <Route path="/morador/aprovacoes" element={<ResidentListPage type="aprovacoes" />} />
      <Route path="/morador/perfil" element={<ProfilePage />} />
      <Route path="/portaria" element={<DesktopDashboard role="portaria" />} />
      <Route path="/portaria/visitantes" element={<EntityPage role="portaria" type="visitantesPortaria" />} />
      <Route path="/portaria/prestadores" element={<EntityPage role="portaria" type="prestadores" />} />
      <Route path="/portaria/encomendas" element={<EntityPage role="portaria" type="encomendasPortaria" />} />
      <Route path="/portaria/avisos" element={<EntityPage role="portaria" type="avisos" />} />
      <Route path="/portaria/chamados" element={<EntityPage role="portaria" type="chamadosPortaria" />} />
      <Route path="/portaria/historico" element={<EntityPage role="portaria" type="historico" />} />
      <Route path="/admin" element={<DesktopDashboard role="admin" />} />
      <Route path="/admin/moradores" element={<EntityPage role="admin" type="moradores" />} />
      <Route path="/admin/unidades" element={<EntityPage role="admin" type="unidades" />} />
      <Route path="/admin/encomendas" element={<EntityPage role="admin" type="encomendasAdmin" />} />
      <Route path="/admin/reservas" element={<EntityPage role="admin" type="reservas" />} />
      <Route path="/admin/visitantes" element={<EntityPage role="admin" type="visitantesAdmin" />} />
      <Route path="/admin/comunicados" element={<EntityPage role="admin" type="comunicados" />} />
      <Route path="/admin/chamados" element={<EntityPage role="admin" type="chamadosAdmin" />} />
      <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
