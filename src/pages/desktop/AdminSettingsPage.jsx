import { useState } from 'react'
import DynamicForm from '../../components/DynamicForm'
import { useAppData } from '../../context/AppDataContext'
import DesktopLayout from '../../layouts/DesktopLayout'

const fields = [
  { key: 'name', label: 'Nome do condomínio', required: true },
  { key: 'address', label: 'Endereço', required: true },
  { key: 'phone', label: 'Telefone', required: true },
  { key: 'email', label: 'E-mail', type: 'email', required: true },
  { key: 'allowResidentBookings', label: 'Permitir solicitações de reserva pelos moradores', type: 'checkbox' },
]

export default function AdminSettingsPage() {
  const { data, actions } = useAppData()
  const [form, setForm] = useState(data.condominium)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  function submit(event) {
    event.preventDefault()
    const missing = fields.find((field) => field.required && !String(form[field.key] || '').trim())
    if (missing) { setError(`Preencha o campo “${missing.label}”.`); return }
    actions.saveCondominium(form); setSaved(true); setTimeout(() => setSaved(false), 2400)
  }
  return <DesktopLayout role="admin"><section className="entity-page settings-page"><div className="entity-heading"><div><h1>Configurações</h1><p>Atualize os dados básicos e preferências do condomínio.</p></div></div><form className="settings-card" onSubmit={submit}><h2>Dados do condomínio</h2><DynamicForm fields={fields} values={form} onChange={(key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }} error={error} /><button className="desktop-primary" type="submit">Salvar alterações</button></form></section>{saved && <div className="toast">Configurações salvas com sucesso.</div>}</DesktopLayout>
}
