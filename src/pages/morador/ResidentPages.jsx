import { CalendarCheck, CheckCircle2, ChevronRight, LogOut, MapPin, Megaphone, Package, Phone, ShieldCheck, TicketCheck, UserRound, UsersRound, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RecordDetails from '../../components/RecordDetails'
import ConfirmDialog from '../../components/ConfirmDialog'
import DynamicForm from '../../components/DynamicForm'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ResidentPageHeader from '../../components/ResidentPageHeader'
import StatusBadge from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import ResidentLayout from '../../layouts/ResidentLayout'
import { logout } from '../../services/authApi'
import { reservasService } from '../../services/reservasService'
import { availabilityFromOccupation, bookableAreas, carregarOcupacaoDoPeriodo } from '../../services/reservasApi'
import { TICKET_COMMON_AREA, ticketUnitLabel } from '../../services/chamadosApi'
import { statusLabel, sameUnit, activeNotices, basicValidation } from '../../services/serviceUtils'
import { visitantesService } from '../../services/visitantesService'

import { confirmationMessage, emptyMessage } from '../../config/uiPresentation'
import { priorities, commonAreas } from '../../config/catalogs'

const serviceItems = [
  ['Reservas', 'Reserve e acompanhe áreas comuns.', '/morador/reservas', CalendarCheck],
  ['Visitantes', 'Cadastre e acompanhe seus visitantes.', '/morador/visitantes', UsersRound],
  ['Chamados', 'Abra e acompanhe suas solicitações.', '/morador/chamados', Wrench],
]


export function CommunicationsPage() {
  const navigate = useNavigate()
  const { data } = useAppData()
  const [tab, setTab] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const items = useMemo(() => {
    const notices = activeNotices(data.notices, data.currentResident).map((notice) => ({ id: notice.id, type: 'Aviso', title: notice.title, text: notice.content, time: `${notice.startDate} · ${statusLabel(notice.priority)}`, tone: notice.priority === 'URGENTE' ? 'red' : 'green', icon: Megaphone, link: `/morador/comunicados/${encodeURIComponent(notice.id)}` }))
    const packages = data.packages.filter((item) => sameUnit(item, data.currentResident) && item.status === 'AGUARDANDO_RETIRADA').map((item) => ({ id: item.id, type: 'Encomenda', title: 'Nova encomenda recebida', text: `${item.code || item.id} está aguardando retirada na portaria.`, time: item.receivedAt, tone: 'green', icon: Package }))
    return [...packages, ...notices]
  }, [data])
  const visible = items.filter((item) => tab === 'Todos' || item.type === tab.slice(0, -1))
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Comunicados</h1><p>Acompanhe as novidades do seu condomínio.</p></div><div className="mobile-tabs">{['Todos', 'Encomendas', 'Avisos'].map((item) => <button aria-pressed={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><div className="communication-list">{visible.map((item) => { const Icon = item.icon; return <button onClick={() => item.link ? navigate(item.link) : setSelected(item)} key={item.id}><span className={`communication-icon ${item.tone}`}><Icon size={18} /></span><span><small>{item.type}</small><strong>{item.title}</strong><p>{item.text}</p><em>{item.time}</em></span><ChevronRight size={16} /></button> })}</div>{visible.length === 0 && <EmptyState title={emptyMessage('notices', Boolean(items.length && tab !== 'Todos'))} onClear={items.length && tab !== 'Todos' ? () => setTab('Todos') : undefined} />}</section><Modal open={Boolean(selected)} title={selected?.title || 'Comunicado'} onClose={() => setSelected(null)} ><div className="detail-copy"><p>{selected?.text}</p><p>{selected?.time}</p></div></Modal></ResidentLayout>
}

export function CommunicationDetail() {
  const { data } = useAppData()
  const { id } = useParams()
  const notice = activeNotices(data.notices, data.currentResident).find((item) => item.id === id)
  return <ResidentLayout><section className="resident-page"><ResidentPageHeader backTo="/morador/comunicados" title={notice?.title || 'Comunicado não encontrado'} subtitle={notice ? `${notice.startDate} · ${statusLabel(notice.priority)}` : ''} /><article className="detail-copy"><p>{notice ? notice.content : 'Este comunicado não está disponível para consulta.'}</p></article></section></ResidentLayout>
}

export function MorePage() {
  const navigate = useNavigate(); const { data } = useAppData()
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Mais</h1><p>Acesse os serviços do seu condomínio.</p></div><h3 className="section-label">Serviços</h3><div className="service-list">{serviceItems.map(([title, text, to, Icon]) => <button key={title} onClick={() => navigate(to)}><Icon size={21} /><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={17} /></button>)}</div>{data.currentResident.isOwner && <><h3 className="section-label">Pendências</h3><div className="service-list"><button onClick={() => navigate('/morador/aprovacoes')}><CheckCircle2 size={21} /><span><strong>Aprovações</strong><small>Reservas aguardando sua análise.</small><em>{data.reservations.filter((item) => sameUnit(item, data.currentResident) && item.status === 'AGUARDANDO_APROVACAO').length} pendente(s)</em></span><ChevronRight size={17} /></button></div></>}</section></ResidentLayout>
}

const visitorFields = [{ key: 'name', label: 'Nome do visitante', required: true }, { key: 'cpf', label: 'CPF', required: true }, { key: 'phone', label: 'Telefone' }, { key: 'startDate', label: 'Data de início', type: 'date', required: true }, { key: 'startTime', label: 'Horário de início', type: 'timeselect', required: true }, { key: 'endDate', label: 'Data de término', type: 'date', required: true }, { key: 'endTime', label: 'Horário de término', type: 'timeselect', required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }]
const reservationFields = [{ key: 'area', label: 'Área comum', type: 'select', options: commonAreas, required: true }, { key: 'date', label: 'Data', type: 'date', required: true }, { key: 'startTime', label: 'Horário inicial', type: 'timeselect', required: true }, { key: 'endTime', label: 'Horário final', type: 'timeselect', required: true }, { key: 'endDate', label: 'Termina no dia (só se passar da meia-noite)', type: 'date' }, { key: 'notes', label: 'Observação', type: 'textarea' }]

function ticketFields(resident, units) {
  const ownLocation = `Unidade ${resident.unit} · ${resident.tower}`
  const towers = [...new Set(units.map((item) => item.tower))]
  return [{ key: 'title', label: 'Título', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', required: true }, { key: 'category', label: 'Categoria', type: 'select', options: ['Manutenção', 'Convivência', 'Segurança', 'Outros'], required: true }, { key: 'location', label: 'Local', type: 'select', options: [ownLocation, 'Área comum', ...towers, 'Corredores', 'Elevadores', 'Garagem', 'Outro local'], required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: priorities, required: true }, { key: 'notes', label: 'Observação', type: 'textarea' }]
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

export function ResidentListPage(props) {
  return <ResidentListModule key={props.type} {...props} />
}

function ResidentListModule({ type }) {
  const config = listConfigs[type]
  const { data, actions, remote } = useAppData()
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [details, setDetails] = useState(null)
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [occupation, setOccupation] = useState({ key: '', slots: null, error: '' })
  const statuses = config.tabs[tab][1]
  const ownLocation = `Unidade ${data.currentResident.unit} · ${data.currentResident.tower}`
  // Com a API ligada, reservas usam as áreas do condomínio e a agenda real (/ocupacao)
  const remoteReservations = Boolean(remote?.reservations && remote.reservations.status !== 'idle') && ['reservas', 'aprovacoes'].includes(type)
  const remoteTickets = Boolean(remote?.tickets && remote.tickets.status !== 'idle') && type === 'chamados'
  const remoteVisitors = Boolean(remote?.visitors && remote.visitors.status !== 'idle') && type === 'visitantes'
  const [comment, setComment] = useState('')
  const areaOptions = bookableAreas(data.areas || [])
  const selectedArea = areaOptions.find((area) => area.name === form.area)
  // Chamado na API: a própria unidade ou a área comum; sem categoria, vai para Outros
  const ownUnit = (data.units || []).find((unit) => unit.id === data.currentResident.unitId)
  const fields = remoteTickets
    ? [{ key: 'title', label: 'Título', required: true }, { key: 'description', label: 'Descrição', type: 'textarea', required: true }, { key: 'category', label: 'Categoria (sem escolha, vai para Outros)', type: 'select', options: (data.ticketCategories || []).map((category) => category.name) }, { key: 'location', label: 'Local', type: 'select', options: [...(ownUnit ? [ticketUnitLabel(ownUnit)] : []), TICKET_COMMON_AREA], required: true }, { key: 'priority', label: 'Prioridade', type: 'select', options: priorities, required: true }]
    : type === 'chamados'
    ? ticketFields(data.currentResident, data.units)
    : remoteReservations
      ? config.fields.filter((field) => field.key !== 'notes').map((field) => field.key === 'area' ? { ...field, options: areaOptions.map((area) => area.name) } : field)
      : config.fields
  // A reserva que passa da meia-noite consulta também a agenda do dia em que termina
  const occupationKey = remoteReservations && type === 'reservas' && selectedArea && form.date ? `${selectedArea.id}|${form.date}|${form.endDate || ''}` : ''
  useEffect(() => {
    if (!occupationKey) return undefined
    let current = true
    const [areaId, date, endDate] = occupationKey.split('|')
    setOccupation({ key: occupationKey, slots: null, error: '' })
    carregarOcupacaoDoPeriodo(areaId, date, endDate).then(
      (slots) => { if (current) setOccupation({ key: occupationKey, slots, error: '' }) },
      (loadError) => { if (current) setOccupation({ key: occupationKey, slots: null, error: loadError.message }) },
    )
    return () => { current = false }
  }, [occupationKey])
  const records = useMemo(() => {
    if (type === 'visitantes') return visitantesService.listar(data.visitors, { unit: data.currentResident.unit, tower: data.currentResident.tower, statuses })
    if (type === 'reservas' || type === 'aprovacoes') return reservasService.listar(data.reservations, { unit: data.currentResident.unit, tower: data.currentResident.tower, statuses })
    // Na API o servidor já entrega só os chamados do morador e da unidade dele (inclusive de área comum)
    return data.tickets.filter((item) => (remoteTickets || sameUnit(item, data.currentResident)) && (!statuses.length || statuses.includes(item.status)))
  }, [data, statuses, type, remoteTickets])
  const remoteAvailability = () => {
    if (occupation.key !== occupationKey) return { available: false, message: 'Verificando disponibilidade...' }
    if (occupation.error) return { available: false, message: occupation.error }
    if (!occupation.slots) return { available: false, message: 'Verificando disponibilidade...' }
    return availabilityFromOccupation(occupation.slots, form)
  }
  const availability = type === 'reservas' && form.area && form.date && form.startTime && form.endTime
    ? (remoteReservations ? remoteAvailability() : reservasService.verificarDisponibilidade(data.reservations, form))
    : null
  const approvalNote = remoteReservations && type === 'reservas' && selectedArea?.requiresApproval
    ? (data.currentResident.isOwner ? 'Esta área exige aprovação; como proprietário, sua reserva é confirmada na hora.' : 'Esta área exige aprovação: a reserva fica pendente até o proprietário da unidade ou a administração aprovar.')
    : ''
  const flash = (message) => { setSuccess(message); setTimeout(() => setSuccess(''), 2500) }
  async function save() {
    if (busy) return
    if (type === 'reservas' && !data.condominium.allowResidentBookings) { setError('Solicitações de reserva estão temporariamente indisponíveis.'); return }
    const missing = fields.find((field) => field.required && !String(form[field.key] || '').trim())
    if (missing) { setError(`Preencha o campo “${missing.label}”.`); return }
    if (type === 'visitantes') {
      // Na API quem confere o vínculo com a unidade é o servidor (o morador não recebe a lista de moradores)
      if (!remoteVisitors && !visitantesService.podeAutorizar(data.residents, data.currentResident)) { setError('Seu perfil não possui vínculo ativo com esta unidade.'); return }
      const periodError = authorizationPeriodError(form) || basicValidation(form)
      if (periodError) { setError(periodError); return }
    }
    if (type === 'reservas' && !availability?.available) { setError(availability?.message || 'Verifique a disponibilidade.'); return }
    if (remoteVisitors) {
      setBusy(true)
      try {
        await actions.saveVisitorRemote(form, true)
        setOpen(false); setForm({}); flash('Visitante autorizado com sucesso.')
      } catch (saveError) {
        setError(saveError.message)
      } finally {
        setBusy(false)
      }
      return
    }
    if (remoteTickets) {
      setBusy(true)
      try {
        await actions.openTicketRemote(form)
        setOpen(false); setForm({}); flash('Chamado aberto com sucesso.')
      } catch (saveError) {
        setError(saveError.message)
      } finally {
        setBusy(false)
      }
      return
    }
    if (remoteReservations && type === 'reservas') {
      setBusy(true)
      try {
        await actions.addReservationRemote(form)
        setOpen(false); setForm({})
        flash(selectedArea?.requiresApproval && !data.currentResident.isOwner ? 'Reserva solicitada. Ela fica pendente até ser aprovada.' : 'Reserva confirmada.')
      } catch (saveError) {
        setError(saveError.message)
      } finally {
        setBusy(false)
      }
      return
    }
    if (type === 'visitantes') actions.addVisitor({ ...form, tower: data.currentResident.tower, unit: data.currentResident.unit, resident: data.currentResident.name }, 'MORADOR')
    if (type === 'reservas') actions.addReservation(form)
    if (type === 'chamados') actions.addTicket({ ...form, resident: data.currentResident.name, tower: data.currentResident.tower, unit: data.currentResident.unit })
    setOpen(false); setForm({}); flash(type === 'visitantes' ? 'Visitante autorizado com sucesso.' : type === 'reservas' ? 'Reserva criada com sucesso.' : 'Chamado aberto com sucesso.')
  }
  async function confirm() {
    if (remoteVisitors && pending.kind === 'visitor') {
      if (busy) return
      setBusy(true)
      try {
        await actions.setVisitorStatusRemote(pending.record.id, pending.status)
        flash(pending.status === 'AUTORIZADO' ? 'Visita autorizada.' : 'Autorização recusada.')
      } catch (actionError) {
        flash(actionError.message)
      } finally {
        setBusy(false); setDetails(null); setPending(null)
      }
      return
    }
    if (remoteReservations && pending.kind === 'reservation') {
      if (busy) return
      setBusy(true)
      try {
        await actions.setReservationStatusRemote(pending.record.id, pending.status)
        flash(pending.status === 'CONFIRMADA' ? 'Reserva aprovada.' : pending.status === 'RECUSADA' ? 'Reserva recusada.' : 'Reserva cancelada.')
      } catch (actionError) {
        flash(actionError.message)
      } finally {
        setBusy(false); setDetails(null); setPending(null)
      }
      return
    }
    if (pending.kind === 'reservation') actions.setReservationStatus(pending.record.id, pending.status)
    setDetails(null); setPending(null); flash('Solicitação atualizada com sucesso.')
  }
  // Na API, cancela quem pediu (ou a administração); o restante da unidade só acompanha
  const canCancel = (record) => !['CANCELADA', 'CONCLUIDA', 'RECUSADA'].includes(record.status) && (!remoteReservations || record.resident === data.currentResident.name)
  function summary(record) {
    if (type === 'visitantes') return [`${record.startDate} · ${record.startTime}`, `Até ${record.endDate} · ${record.endTime}`, statusLabel(record.status)]
    if (type === 'chamados') return [record.code || record.id, record.openedAt, statusLabel(record.status)]
    return [record.date, `${record.startTime} – ${record.endTime}${record.endDate ? ` (termina em ${record.endDate})` : ''}`, statusLabel(record.status)]
  }
  if (type === 'aprovacoes' && !data.currentResident.isOwner) return <ResidentLayout><section className="resident-page"><ResidentPageHeader backTo="/morador/mais" title="Aprovações" subtitle="Acesso exclusivo para proprietários." /><EmptyState title="Seu vínculo não possui permissão para aprovar reservas." /></section></ResidentLayout>
  const collection = type === 'visitantes' ? 'visitors' : type === 'chamados' ? 'tickets' : 'reservations'
  const ownRecords = remoteTickets ? data.tickets : data[collection].filter((item) => sameUnit(item, data.currentResident))
  function openDetails(record) {
    setDetails(record); setComment('')
    if (remoteTickets) refreshTicket(record.id)
  }
  function refreshTicket(id) {
    actions.loadTicketDetail(id).then((full) => setDetails((current) => current?.id === id ? full : current), () => {})
  }
  async function sendComment() {
    if (busy) return
    setBusy(true)
    try {
      await actions.commentTicketRemote(details.id, comment)
      setComment(''); refreshTicket(details.id); flash('Comentário adicionado.')
    } catch (commentError) {
      flash(commentError.message)
    } finally {
      setBusy(false)
    }
  }
  const emptyFiltered = Boolean(ownRecords.length && statuses.length)
  const Icon = config.icon
  return <ResidentLayout><section className="resident-page"><ResidentPageHeader backTo="/morador/mais" title={config.title} subtitle={config.subtitle} action={config.action} onAction={() => { if (type === 'reservas' && !data.condominium.allowResidentBookings) { flash('Solicitações de reserva estão temporariamente indisponíveis.'); return } setForm(type === 'chamados' ? { location: ownLocation } : {}); setError(''); setOpen(true) }} /><div className="mobile-tabs">{config.tabs.map(([label], index) => <button aria-pressed={tab === index} className={tab === index ? 'active' : ''} onClick={() => setTab(index)} key={label}>{label}</button>)}</div><h3 className="section-label">{config.title}</h3><div className="resident-card-list">{records.map((record) => { const info = summary(record); return <button key={record.id} onClick={() => openDetails(record)}><Icon size={21} /><span><strong>{record.name || record.area || record.title}</strong><small>{info[0]}</small><small>{info[1]}</small><StatusBadge status={record.status}>{info[2]}</StatusBadge></span><ChevronRight size={16} /></button> })}</div>{records.length === 0 && <EmptyState title={emptyMessage(type === 'aprovacoes' ? 'approvals' : collection, emptyFiltered)} onClear={emptyFiltered && tab > 0 ? () => setTab(0) : undefined} />}</section>
    <Modal open={open} title={config.action} onClose={() => setOpen(false)} onConfirm={save} confirmLabel={busy ? 'Enviando...' : config.action}><DynamicForm fields={fields} values={form} onChange={(key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }} error={error} />{availability && error !== availability.message && <p className={availability.available ? 'availability availability--ok' : 'availability availability--error'}>{availability.message}</p>}{approvalNote && <p className="form-note">{approvalNote}</p>}{remoteReservations && type === 'reservas' && !areaOptions.length && <p className="form-note">Nenhuma área comum disponível para reserva no momento.</p>}{type === 'visitantes' && <p className="form-note">Unidade vinculada: {data.currentResident.unit} · {data.currentResident.tower}. Proprietários e inquilinos vinculados podem autorizar.</p>}</Modal>
    <Modal open={Boolean(details)} title={details ? `Detalhes · ${/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(details.id)) ? details.area || details.name || details.title || '' : details.id}` : 'Detalhes'} onClose={() => setDetails(null)} ><RecordDetails record={details} collection={collection} />{details && remoteVisitors && details.status === 'PENDENTE' && <div className="detail-actions"><button className="primary-button" onClick={() => setPending({ kind: 'visitor', record: details, status: 'AUTORIZADO', label: 'Autorizar visita' })}>Autorizar</button><button className="danger-button" onClick={() => setPending({ kind: 'visitor', record: details, status: 'RECUSADO', label: 'Recusar visita' })}>Recusar</button></div>}{details && remoteVisitors && details.status === 'AUTORIZADO' && <div className="detail-actions"><button className="danger-button" onClick={() => setPending({ kind: 'visitor', record: details, status: 'RECUSADO', label: 'Revogar autorização' })}>Revogar autorização</button></div>}{details && remoteTickets && details.status !== 'ENCERRADO' && <div className="comment-box"><label>Adicionar comentário<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escreva uma atualização ou pergunta" /></label><button className="secondary-button" disabled={!comment.trim() || busy} onClick={sendComment}>Adicionar comentário</button></div>}{details && type === 'reservas' && canCancel(details) && <div className="detail-actions"><button className="danger-button" onClick={() => setPending({ kind: 'reservation', record: details, status: 'CANCELADA', label: 'Cancelar reserva' })}>Cancelar reserva</button></div>}{details && (type === 'aprovacoes' || (type === 'reservas' && data.currentResident.isOwner)) && details.status === 'AGUARDANDO_APROVACAO' && <div className="detail-actions"><button className="primary-button" onClick={() => setPending({ kind: 'reservation', record: details, status: 'CONFIRMADA', label: 'Aprovar reserva' })}>Aprovar</button><button className="danger-button" onClick={() => setPending({ kind: 'reservation', record: details, status: 'RECUSADA', label: 'Recusar reserva' })}>Recusar</button></div>}</Modal>
    <ConfirmDialog open={Boolean(pending)} title={pending?.label} message={confirmationMessage(pending?.record, pending?.label, pending?.status)} confirmLabel={pending?.label || 'Confirmar'} destructive={['CANCELADA', 'RECUSADA', 'RECUSADO'].includes(pending?.status)} onCancel={() => setPending(null)} onConfirm={confirm} /><div role="status" aria-live="polite" aria-atomic="true">{success && <div className="toast">{success}</div>}</div></ResidentLayout>
}

export function ProfilePage() {
  const navigate = useNavigate(); const { data } = useAppData(); const resident = data.currentResident
  return <ResidentLayout><section className="resident-page"><div className="resident-title"><h1>Meu perfil</h1><p>Consulte seus dados e os dados da sua unidade.</p></div><div className="profile-card"><span>{resident.name.split(' ').map((item) => item[0]).slice(0, 2).join('')}</span><div><strong>{resident.name}</strong><small>Apartamento {resident.unit} · {resident.tower}</small><StatusBadge>{resident.relation === 'PROPRIETARIO' ? 'Proprietário' : 'Inquilino'}</StatusBadge></div></div><h3 className="section-label">Dados pessoais</h3><div className="profile-list"><div><UserRound /><span><small>Nome</small><strong>{resident.name}</strong></span></div><div><ShieldCheck /><span><small>CPF</small><strong>{resident.cpf}</strong></span></div><div><Phone /><span><small>Telefone</small><strong>{resident.phone}</strong></span></div></div><h3 className="section-label">Dados da unidade</h3><div className="profile-list"><div><MapPin /><span><small>Condomínio</small><strong>{data.condominium.name}</strong></span></div><div><TicketCheck /><span><small>Unidade</small><strong>Apartamento {resident.unit} · {resident.tower}</strong></span></div></div><button className="logout-button" onClick={() => { logout(); navigate('/') }}><LogOut size={18} /> Sair da conta</button></section></ResidentLayout>
}
