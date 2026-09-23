import { CalendarCheck, CheckCircle2, ChevronRight, CircleUserRound, LogOut, MapPin, Megaphone, Package, Phone, ShieldCheck, TicketCheck, UserRound, UsersRound, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import DynamicForm from '../../components/DynamicForm'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ResidentPageHeader from '../../components/ResidentPageHeader'
import StatusBadge from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import ResidentLayout from '../../layouts/ResidentLayout'
import { reservasService } from '../../services/reservasService'
import { statusLabel } from '../../services/serviceUtils'
import { visitantesService } from '../../services/visitantesService'

const serviceItems = [
  ['Reservas', 'Reserve e acompanhe áreas comuns.', '/morador/reservas', CalendarCheck],
  ['Visitantes', 'Cadastre e acompanhe seus visitantes.', '/morador/visitantes', UsersRound],
  ['Chamados', 'Abra e acompanhe suas solicitações.', '/morador/chamados', Wrench],
]

function toneFor(status = '') { return /cancel|recus|urgente|expir/i.test(status) ? 'red' : /aguardando|analise|pendente/i.test(status) ? 'violet' : 'green' }

export function CommunicationsPage() {
  const navigate = useNavigate()
  const { data } = useAppData()
  const [tab, setTab] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const items = useMemo(() => {
    const notices = data.notices.filter((notice) => notice.status === 'ATIVO' && (notice.destination === 'Todo condomínio' || notice.tower === data.currentResident.tower)).map((notice) => ({ id: notice.id, type: 'Aviso', title: notice.title, text: notice.content, time: `${notice.startDate} · ${statusLabel(notice.priority)}`, tone: notice.priority === 'URGENTE' ? 'red' : 'green', icon: Megaphone, link: notice.title.includes('água') ? '/morador/comunicados/agua' : '' }))
    const packages = data.packages.filter((item) => item.unit === data.currentResident.unit && item.status === 'AGUARDANDO_RETIRADA').map((item) => ({ id: item.id, type: 'Encomenda', title: 'Nova encomenda recebida', text: `${item.id} está aguardando retirada na portaria.`, time: item.receivedAt, tone: 'green', icon: Package }))
    return [...packages, ...notices]
  }, [data])
  const visible = items.filter((item) => tab === 'Todos' || item.type === tab.slice(0, -1))
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Comunicados</h1><p>Acompanhe as novidades do seu condomínio.</p></div><div className="mobile-tabs">{['Todos', 'Encomendas', 'Avisos'].map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><div className="communication-list">{visible.map((item) => { const Icon = item.icon; return <button onClick={() => item.link ? navigate(item.link) : setSelected(item)} key={item.id}><span className={`communication-icon ${item.tone}`}><Icon size={18} /></span><span><small>{item.type}</small><strong>{item.title}</strong><p>{item.text}</p><em>{item.time}</em></span><ChevronRight size={16} /></button> })}</div>{visible.length === 0 && <EmptyState title="Nenhum comunicado encontrado." onClear={() => setTab('Todos')} />}</section><Modal open={Boolean(selected)} title={selected?.title || 'Comunicado'} onClose={() => setSelected(null)} onConfirm={() => setSelected(null)} confirmLabel="Fechar"><div className="detail-copy"><p>{selected?.text}</p><p>{selected?.time}</p></div></Modal></ResidentLayout>
}

export function CommunicationDetail() {
  const { data } = useAppData()
  const notice = data.notices.find((item) => item.title.includes('água'))
  return <ResidentLayout><section className="resident-page"><ResidentPageHeader backTo="/morador/comunicados" title={notice?.title || 'Comunicado'} subtitle={`${notice?.startDate || ''} · ${statusLabel(notice?.priority || '')}`} /><article className="detail-copy"><p>{notice?.content}</p><p>A previsão é que o serviço seja normalizado até as 18h.</p><p>Agradecemos a compreensão.</p></article></section></ResidentLayout>
}

export function MorePage() {
  const navigate = useNavigate(); const { data } = useAppData()
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Mais</h1><p>Acesse os serviços do seu condomínio.</p></div><h3 className="section-label">Serviços</h3><div className="service-list">{serviceItems.map(([title, text, to, Icon]) => <button key={title} onClick={() => navigate(to)}><Icon size={21} /><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={17} /></button>)}</div>{data.currentResident.isOwner && <><h3 className="section-label">Pendências</h3><div className="service-list"><button onClick={() => navigate('/morador/aprovacoes')}><CheckCircle2 size={21} /><span><strong>Aprovações</strong><small>Reservas aguardando sua análise.</small><em>{data.reservations.filter((item) => item.unit === data.currentResident.unit && item.status === 'AGUARDANDO_APROVACAO').length} pendente(s)</em></span><ChevronRight size={17} /></button></div></>}</section></ResidentLayout>
}

const visitorFields = [{ key: 'name', label: 'Nome do visitante', required: true }, { key: 'cpf', label: 'CPF', required: true }, { key: 'phone', label: 'Telefone' }, { key: 'startDate', label: 'Data de início', type: 'date', required: true }, { key: 'startTime', label: 'Horário de início', type: 'time', required: true }, { key: 'endDate', label: 'Data de término', type: 'date', required: true }, { key: 'endTime', label: 'Horário de término', type: 'time', required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }]
const reservationFields = [{ key: 'area', label: 'Área comum', type: 'select', options: ['Salão de Festas', 'Churrasqueira', 'Quadra', 'Academia'], required: true }, { key: 'date', label: 'Data', type: 'date', required: true }, { key: 'startTime', label: 'Horário inicial', type: 'time', required: true }, { key: 'endTime', label: 'Horário final', type: 'time', required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }]

function ticketFields(resident, units) {
  const ownLocation = `Unidade ${resident.unit} · ${resident.tower}`
  const towers = [...new Set(units.map((item) => item.tower))]
  return [{ key: 'title', label: 'Título', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', required: true }, { key: 'category', label: 'Categoria', type: 'select', options: ['Manutenção', 'Convivência', 'Segurança', 'Outros'], required: true }, { key: 'location', label: 'Local', type: 'select', options: [ownLocation, 'Área comum', ...towers, 'Corredores', 'Elevadores', 'Garagem', 'Outro local'], required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'], required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }]
}

function authorizationPeriodError(values) {
  if (!values.startDate || !values.startTime || !values.endDate || !values.endTime) return ''
  const start = new Date(`${values.startDate}T${values.startTime}:00`)
  const end = new Date(`${values.endDate}T${values.endTime}:00`)
  return end <= start ? 'O término da autorização deve ser posterior ao início.' : ''
}

const listConfigs = {
  visitantes: { title: 'Visitantes', subtitle: 'Gerencie o acesso dos seus visitantes.', action: 'Autorizar visitante', tabs: [['Todos', []], ['Pendentes', ['PENDENTE']], ['Autorizados', ['AUTORIZADO']], ['Presentes', ['ENTROU']], ['Histórico', ['SAIU', 'RECUSADO', 'EXPIRADO']]], fields: visitorFields, icon: UserRound, empty: 'Nenhum visitante encontrado.' },
  reservas: { title: 'Minhas reservas', subtitle: 'Gerencie suas reservas de áreas comuns.', action: 'Nova reserva', tabs: [['Todas', []], ['Pendentes', ['AGUARDANDO_APROVACAO']], ['Confirmadas', ['CONFIRMADA']], ['Concluídas', ['CONCLUIDA']], ['Canceladas', ['CANCELADA', 'RECUSADA']]], fields: reservationFields, icon: CalendarCheck, empty: 'Nenhuma reserva encontrada.' },
  chamados: { title: 'Chamados', subtitle: 'Acompanhe suas solicitações ao condomínio.', action: 'Abrir chamado', tabs: [['Todos', []], ['Abertos', ['ABERTO']], ['Em análise', ['EM_ANALISE']], ['Em atendimento', ['EM_ATENDIMENTO']], ['Resolvidos', ['RESOLVIDO', 'ENCERRADO']]], fields: [], icon: Wrench, empty: 'Nenhum chamado encontrado.' },
  aprovacoes: { title: 'Aprovações', subtitle: 'Analise reservas vinculadas à sua unidade.', tabs: [['Pendentes', ['AGUARDANDO_APROVACAO']], ['Histórico', ['CONFIRMADA', 'RECUSADA']]], fields: [], icon: CalendarCheck, empty: 'Nenhuma solicitação de aprovação encontrada.' },
}

export function ResidentListPage({ type }) {
  const config = listConfigs[type]
  const { data, actions } = useAppData()
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [details, setDetails] = useState(null)
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(null)
  const statuses = config.tabs[tab][1]
  const ownLocation = `Unidade ${data.currentResident.unit} · ${data.currentResident.tower}`
  const fields = type === 'chamados' ? ticketFields(data.currentResident, data.units) : config.fields
  const records = useMemo(() => {
    if (type === 'visitantes') return visitantesService.listar(data.visitors, { unit: data.currentResident.unit, statuses })
    if (type === 'reservas' || type === 'aprovacoes') return reservasService.listar(data.reservations, { unit: data.currentResident.unit, statuses })
    return data.tickets.filter((item) => item.unit === data.currentResident.unit && (!statuses.length || statuses.includes(item.status)))
  }, [data, statuses, type])
  const availability = type === 'reservas' && form.area && form.date && form.startTime && form.endTime ? reservasService.verificarDisponibilidade(data.reservations, form) : null
  const flash = (message) => { setSuccess(message); setTimeout(() => setSuccess(''), 2500) }
  function save() {
    const missing = fields.find((field) => field.required && !String(form[field.key] || '').trim())
    if (missing) { setError(`Preencha o campo “${missing.label}”.`); return }
    if (type === 'visitantes') {
      if (!visitantesService.podeAutorizar(data.residents, data.currentResident)) { setError('Seu perfil não possui vínculo ativo com esta unidade.'); return }
      const periodError = authorizationPeriodError(form)
      if (periodError) { setError(periodError); return }
    }
    if (type === 'reservas' && !availability?.available) { setError(availability?.message || 'Verifique a disponibilidade.'); return }
    if (type === 'visitantes') actions.addVisitor({ ...form, tower: data.currentResident.tower, unit: data.currentResident.unit, resident: data.currentResident.name }, 'MORADOR')
    if (type === 'reservas') actions.addReservation(form)
    if (type === 'chamados') actions.addTicket({ ...form, resident: data.currentResident.name, tower: data.currentResident.tower, unit: data.currentResident.unit })
    setOpen(false); setForm({}); flash(type === 'visitantes' ? 'Visitante autorizado com sucesso.' : type === 'reservas' ? 'Reserva criada com sucesso.' : 'Chamado aberto com sucesso.')
  }
  function confirm() {
    if (pending.kind === 'reservation') actions.setReservationStatus(pending.record.id, pending.status)
    setDetails(null); setPending(null); flash('Solicitação atualizada com sucesso.')
  }
  function summary(record) {
    if (type === 'visitantes') return [`${record.startDate} · ${record.startTime}`, `Até ${record.endDate} · ${record.endTime}`, statusLabel(record.status)]
    if (type === 'chamados') return [record.id, record.openedAt, statusLabel(record.status)]
    return [record.date, `${record.startTime} – ${record.endTime}`, statusLabel(record.status)]
  }
  if (type === 'aprovacoes' && !data.currentResident.isOwner) return <ResidentLayout><section className="resident-page"><ResidentPageHeader backTo="/morador/mais" title="Aprovações" subtitle="Acesso exclusivo para proprietários." /><EmptyState title="Seu vínculo não possui permissão para aprovar reservas." /></section></ResidentLayout>
  const Icon = config.icon
  return <ResidentLayout><section className="resident-page"><ResidentPageHeader backTo="/morador/mais" title={config.title} subtitle={config.subtitle} action={config.action} onAction={() => { setForm(type === 'chamados' ? { location: ownLocation } : {}); setError(''); setOpen(true) }} /><div className="mobile-tabs">{config.tabs.map(([label], index) => <button className={tab === index ? 'active' : ''} onClick={() => setTab(index)} key={label}>{label}</button>)}</div><h3 className="section-label">{config.title}</h3><div className="resident-card-list">{records.map((record) => { const info = summary(record); return <button key={record.id} onClick={() => setDetails(record)}><Icon size={21} /><span><strong>{record.name || record.area || record.title}</strong><small>{info[0]}</small><small>{info[1]}</small><StatusBadge tone={toneFor(record.status)}>{info[2]}</StatusBadge></span><ChevronRight size={16} /></button> })}</div>{records.length === 0 && <EmptyState title={config.empty} onClear={tab ? () => setTab(0) : undefined} />}</section>
    <Modal open={open} title={config.action} onClose={() => setOpen(false)} onConfirm={save} confirmLabel={config.action}><DynamicForm fields={fields} values={form} onChange={(key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }} error={error} />{availability && <p className={availability.available ? 'availability availability--ok' : 'availability availability--error'}>{availability.message}</p>}{type === 'visitantes' && <p className="form-note">Unidade vinculada: {data.currentResident.unit} · {data.currentResident.tower}. Proprietários e inquilinos vinculados podem autorizar.</p>}</Modal>
    <Modal open={Boolean(details)} title={details ? `Detalhes · ${details.id}` : 'Detalhes'} onClose={() => setDetails(null)} onConfirm={() => setDetails(null)} confirmLabel="Fechar"><div className="record-details">{details && Object.entries(details).filter(([key]) => !['comments'].includes(key)).map(([key, value]) => <div key={key}><small>{statusLabel(key)}</small><strong>{String(value || '—')}</strong></div>)}</div>{details && type === 'reservas' && !['CANCELADA', 'CONCLUIDA'].includes(details.status) && <div className="detail-actions"><button className="danger-button" onClick={() => setPending({ kind: 'reservation', record: details, status: 'CANCELADA', label: 'Cancelar reserva' })}>Cancelar reserva</button></div>}{details && type === 'aprovacoes' && details.status === 'AGUARDANDO_APROVACAO' && <div className="detail-actions"><button className="primary-button" onClick={() => setPending({ kind: 'reservation', record: details, status: 'CONFIRMADA', label: 'Aprovar reserva' })}>Aprovar</button><button className="danger-button" onClick={() => setPending({ kind: 'reservation', record: details, status: 'RECUSADA', label: 'Recusar reserva' })}>Recusar</button></div>}</Modal>
    <ConfirmDialog open={Boolean(pending)} title={pending?.label} message={`Confirma a ação “${pending?.label || ''}”?`} onCancel={() => setPending(null)} onConfirm={confirm} />{success && <div className="toast">{success}</div>}</ResidentLayout>
}

export function ProfilePage() {
  const navigate = useNavigate(); const { data } = useAppData(); const resident = data.currentResident
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Meu perfil</h1><p>Gerencie seus dados e sua conta.</p></div><div className="profile-card"><span>{resident.name.split(' ').map((item) => item[0]).slice(0, 2).join('')}</span><div><strong>{resident.name}</strong><small>Apartamento {resident.unit} · {resident.tower}</small><StatusBadge>{resident.relation === 'PROPRIETARIO' ? 'Proprietário' : 'Inquilino'}</StatusBadge></div></div><h3 className="section-label">Dados pessoais</h3><div className="profile-list"><div><UserRound /><span><small>Nome</small><strong>{resident.name}</strong></span></div><div><ShieldCheck /><span><small>CPF</small><strong>{resident.cpf}</strong></span></div><div><Phone /><span><small>Telefone</small><strong>{resident.phone}</strong></span></div></div><h3 className="section-label">Dados da unidade</h3><div className="profile-list"><div><MapPin /><span><small>Condomínio</small><strong>{data.condominium.name}</strong></span></div><div><TicketCheck /><span><small>Unidade</small><strong>Apartamento {resident.unit} · {resident.tower}</strong></span></div></div><button className="logout-button" onClick={() => navigate('/')}><LogOut size={18} /> Sair da conta</button></section></ResidentLayout>
}
