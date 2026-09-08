import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import DynamicForm from '../../components/DynamicForm'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import { entityConfigs } from '../../config/entityConfigs'
import { useAppData } from '../../context/AppDataContext'
import DesktopLayout from '../../layouts/DesktopLayout'
import { avisosService } from '../../services/avisosService'
import { moradoresService, unidadesService } from '../../services/cadastrosService'
import { chamadosService } from '../../services/chamadosService'
import { encomendasService } from '../../services/encomendasService'
import { prestadoresService } from '../../services/prestadoresService'
import { reservasService } from '../../services/reservasService'
import { matchesQuery, statusLabel } from '../../services/serviceUtils'
import { visitantesService } from '../../services/visitantesService'

const services = { visitors: visitantesService, providers: prestadoresService, packages: encomendasService, reservations: reservasService, notices: avisosService, tickets: chamadosService, residents: moradoresService, units: unidadesService }

function toneFor(value = '') {
  if (/urgente|alta|cancel|recus|inativo|devolvida/i.test(value)) return 'red'
  if (/pendente|aguardando|aberto/i.test(value)) return 'pink'
  if (/analise|atendimento|esperado|reservado/i.test(value)) return 'violet'
  return 'green'
}

function present(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Nenhum vínculo'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value || '—'
}

function cellValue(record, key, secondKey) {
  if (key === 'isOwner') return { first: record.isOwner ? (record.isResident ? 'Proprietário e residente' : 'Proprietário') : 'Residente', second: '' }
  const first = present(record[key])
  const second = secondKey ? present(record[secondKey]) : ''
  return { first, second: second === '—' ? '' : second }
}

function validate(fields, values) {
  const missing = fields.find((field) => field.required && !String(values[field.key] ?? '').trim())
  if (missing) return `Preencha o campo “${missing.label}”.`
  if (values.destination === 'Torre/Bloco específico' && !values.tower) return 'Selecione a Torre / Bloco.'
  return ''
}

export default function EntityPage({ role, type }) {
  const config = entityConfigs[type]
  const { data, actions } = useAppData()
  const records = data[config.collection]
  const service = services[config.collection]
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState(0)
  const [filters, setFilters] = useState({ tower: '', unit: '', priority: '', category: '', date: '', user: '', operation: '', doorman: '' })
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [comment, setComment] = useState('')

  const tabConfig = config.tabs[tab] || config.tabs[0]
  const rows = useMemo(() => {
    if (config.history) return records.filter((item) => matchesQuery(item, query) && (!filters.date || item.date === filters.date) && (!filters.user || item.user === filters.user) && (!filters.operation || item.type === filters.operation) && (!filters.unit || item.unit.toLowerCase().includes(filters.unit.toLowerCase())))
    const mode = tabConfig[2]
    const values = tabConfig[1]
    const serviceFilters = { query, statuses: mode ? [] : values, relation: mode === 'relation' ? values[0] : '', priority: mode === 'priority' ? values[0] : filters.priority, tower: filters.tower, unit: filters.unit, category: filters.category, doorman: filters.doorman, area: '' }
    return service.listar(records, serviceFilters).filter((item) => !filters.date || item.date === filters.date || item.startDate === filters.date)
  }, [config.history, records, query, filters, service, tabConfig])

  const hasFilters = query || Object.values(filters).some(Boolean) || tab > 0
  const resetFilters = () => { setQuery(''); setTab(0); setFilters({ tower: '', unit: '', priority: '', category: '', date: '', user: '', operation: '', doorman: '' }) }
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const flash = (message) => { setSaved(message); setTimeout(() => setSaved(''), 2600) }
  function startCreate() { setEditing(null); setForm({}); setError(''); setOpen(true) }
  function startEdit(record) { setEditing(record); setForm(config.collection === 'units' ? { ...record, owner: record.owners?.[0] || '', resident: record.residents?.[0] || '' } : { ...record }); setError(''); setDetails(null); setOpen(true) }

  function saveRecord() {
    const validation = validate(config.fields, form)
    if (validation) { setError(validation); return }
    if (editing) {
      if (config.collection === 'residents') actions.updateResident(editing.id, form)
      if (config.collection === 'units') actions.updateUnit(editing.id, { ...form, owners: form.owner ? [form.owner] : [], residents: form.resident ? [form.resident] : [] })
      if (config.collection === 'notices') actions.updateNotice(editing.id, form)
      if (config.collection === 'tickets') actions.updateTicket(editing.id, form)
    } else {
      if (config.collection === 'visitors') actions.addVisitor(form, 'PORTARIA')
      if (config.collection === 'providers') actions.addProvider(form)
      if (config.collection === 'packages') actions.addPackage(form)
      if (config.collection === 'notices') actions.addNotice(form)
      if (config.collection === 'tickets') actions.addTicket(form)
      if (config.collection === 'residents') actions.addResident(form)
      if (config.collection === 'units') actions.addUnit(form)
    }
    setOpen(false); flash(editing ? 'Alterações salvas com sucesso.' : 'Registro salvo com sucesso.')
  }

  function requestAction(action, record, label, status) { setPendingAction({ action, record, label, status }) }
  function confirmAction() {
    const { action, record, status } = pendingAction
    if (action === 'visitor') actions.setVisitorStatus(record.id, status)
    if (action === 'provider') actions.setProviderStatus(record.id, status)
    if (action === 'package') actions.setPackageStatus(record.id, status)
    if (action === 'reservation') actions.setReservationStatus(record.id, status)
    if (action === 'notice') actions.updateNotice(record.id, { status })
    if (action === 'resident') actions.updateResident(record.id, { status })
    if (action === 'ticket') actions.updateTicket(record.id, { status })
    setDetails((current) => current ? { ...current, status } : current); setPendingAction(null); flash('Status atualizado com sucesso.')
  }

  function detailActions(record) {
    if (config.collection === 'visitors') {
      const buttons = record.status === 'PENDENTE' ? [['Autorizar', 'AUTORIZADO'], ['Recusar', 'RECUSADO']] : record.status === 'AUTORIZADO' ? [['Registrar entrada', 'ENTROU']] : record.status === 'ENTROU' ? [['Registrar saída', 'SAIU']] : []
      return buttons.map(([label, status]) => <button key={status} className={status === 'RECUSADO' ? 'danger-button' : 'primary-button'} onClick={() => requestAction('visitor', record, label, status)}>{label}</button>)
    }
    if (config.collection === 'providers') {
      const buttons = record.status === 'ESPERADO' ? [['Registrar entrada', 'ENTROU']] : record.status === 'ENTROU' ? [['Registrar saída', 'SAIU']] : []
      return buttons.map(([label, status]) => <button key={status} className="primary-button" onClick={() => requestAction('provider', record, label, status)}>{label}</button>)
    }
    if (config.collection === 'packages' && role === 'portaria' && record.status === 'AGUARDANDO_RETIRADA') return <button className="primary-button" onClick={() => requestAction('package', record, 'Confirmar retirada', 'RETIRADA')}>Confirmar retirada</button>
    if (config.collection === 'reservations' && !['CANCELADA', 'CONCLUIDA'].includes(record.status)) return <button className="danger-button" onClick={() => requestAction('reservation', record, 'Cancelar reserva', 'CANCELADA')}>Cancelar excepcionalmente</button>
    if (config.collection === 'notices') return <><button className="secondary-button" onClick={() => startEdit(record)}>Editar</button>{record.status === 'ATIVO' && <button className="danger-button" onClick={() => requestAction('notice', record, 'Encerrar comunicado', 'ENCERRADO')}>Encerrar</button>}</>
    if (config.collection === 'residents') return <><button className="secondary-button" onClick={() => startEdit(record)}>Editar</button><button className={record.status === 'ATIVO' ? 'danger-button' : 'primary-button'} onClick={() => requestAction('resident', record, record.status === 'ATIVO' ? 'Desativar morador' : 'Ativar morador', record.status === 'ATIVO' ? 'INATIVO' : 'ATIVO')}>{record.status === 'ATIVO' ? 'Desativar' : 'Ativar'}</button></>
    if (config.collection === 'units') return <button className="secondary-button" onClick={() => startEdit(record)}>Editar e gerenciar vínculos</button>
    if (config.collection === 'tickets') return <div className="ticket-actions"><select value={record.priority} onChange={(event) => { actions.updateTicket(record.id, { priority: event.target.value }); setDetails({ ...record, priority: event.target.value }); flash('Prioridade atualizada.') }}><option>BAIXA</option><option>NORMAL</option><option>ALTA</option><option>URGENTE</option></select>{['EM_ANALISE', 'EM_ATENDIMENTO', 'RESOLVIDO', 'ENCERRADO'].filter((status) => status !== record.status).map((status) => <button className="secondary-button" key={status} onClick={() => requestAction('ticket', record, `Alterar para ${statusLabel(status)}`, status)}>{statusLabel(status)}</button>)}</div>
    return null
  }

  const showTower = !config.history && records.some((item) => item.tower)
  const showUnit = !config.history && records.some((item) => item.unit)
  const showPriority = !config.history && tabConfig[2] !== 'priority' && records.some((item) => item.priority)
  const showCategory = !config.history && records.some((item) => item.category)
  const showDoorman = !config.history && records.some((item) => item.doorman)

  return <DesktopLayout role={role}>
    <section className="entity-page">
      <div className="entity-heading"><div><h1>{config.title}</h1><p>{config.subtitle}</p></div>{config.action && <button className="desktop-primary" onClick={startCreate}>+ {config.action}</button>}</div>
      <div className="entity-toolbar"><div className="tabs">{config.tabs.map(([label], index) => <button className={tab === index ? 'active' : ''} onClick={() => setTab(index)} key={label}>{label}</button>)}</div><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar registros..." /></label></div>
      <div className="advanced-filters">
        {showTower && <label>Torre / Bloco<select value={filters.tower} onChange={(event) => setFilter('tower', event.target.value)}><option value="">Todas</option>{['Torre A', 'Torre B', 'Torre C', 'Área comum'].map((item) => <option key={item}>{item}</option>)}</select></label>}
        {showUnit && <label>Unidade<input value={filters.unit} onChange={(event) => setFilter('unit', event.target.value)} placeholder="Ex.: 203" /></label>}
        {showPriority && <label>Prioridade<select value={filters.priority} onChange={(event) => setFilter('priority', event.target.value)}><option value="">Todas</option>{['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'].map((item) => <option key={item}>{item}</option>)}</select></label>}
        {showCategory && <label>Categoria<select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}><option value="">Todas</option>{[...new Set(records.map((item) => item.category))].map((item) => <option key={item}>{item}</option>)}</select></label>}
        {showDoorman && <label>Porteiro<select value={filters.doorman} onChange={(event) => setFilter('doorman', event.target.value)}><option value="">Todos</option>{[...new Set(records.map((item) => item.doorman))].map((item) => <option key={item}>{item}</option>)}</select></label>}
        {config.history && <><label>Data<input type="date" value={filters.date} onChange={(event) => setFilter('date', event.target.value)} /></label><label>Operação<select value={filters.operation} onChange={(event) => setFilter('operation', event.target.value)}><option value="">Todas</option>{[...new Set(records.map((item) => item.type))].map((item) => <option key={item}>{item}</option>)}</select></label><label>Unidade<input value={filters.unit} onChange={(event) => setFilter('unit', event.target.value)} /></label><label>Usuário<select value={filters.user} onChange={(event) => setFilter('user', event.target.value)}><option value="">Todos</option>{[...new Set(records.map((item) => item.user))].map((item) => <option key={item}>{item}</option>)}</select></label></>}
        {hasFilters && <button className="clear-filters" onClick={resetFilters}>Limpar filtros</button>}
      </div>
      <div className="table-wrap"><table><thead><tr>{config.columns.map(([label]) => <th key={label}>{label}</th>)}<th>Ações</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{config.columns.map(([label, key, secondKey]) => { const value = cellValue(row, key, secondKey); const badge = key === 'status' || key === 'priority'; return <td key={label}>{badge ? <StatusBadge tone={toneFor(value.first)}>{statusLabel(value.first)}</StatusBadge> : <span className="cell-stack"><strong>{value.first}</strong>{value.second && <small>{value.second}</small>}</span>}</td>})}<td><button className="row-action" onClick={() => setDetails(row)}>Ver detalhes</button></td></tr>)}</tbody></table>{rows.length === 0 && <EmptyState title={config.empty} onClear={hasFilters ? resetFilters : undefined} />}</div>
      <div className="pagination"><span>Mostrando {rows.length} de {records.length} registros</span></div>
    </section>
    <Modal open={open} title={editing ? `Editar ${config.title.toLowerCase()}` : config.action || 'Novo registro'} onClose={() => setOpen(false)} onConfirm={saveRecord} confirmLabel={editing ? 'Salvar alterações' : (type.includes('encomendas') ? 'Registrar' : 'Salvar')}><DynamicForm fields={config.fields} values={form} onChange={(key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }} error={error} /></Modal>
    <Modal open={Boolean(details)} title={details ? `Detalhes · ${details.id}` : 'Detalhes'} onClose={() => setDetails(null)} onConfirm={() => setDetails(null)} confirmLabel="Fechar"><div className="record-details">{details && Object.entries(details).filter(([key]) => key !== 'comments').map(([key, value]) => <div key={key}><small>{statusLabel(key)}</small><strong>{present(value)}</strong></div>)}</div>{details && <div className="detail-actions">{detailActions(details)}</div>}{details && config.collection === 'tickets' && <div className="comment-box"><label>Adicionar comentário<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Descreva a atualização" /></label><button className="secondary-button" disabled={!comment.trim()} onClick={() => { actions.updateTicket(details.id, { comments: [...(details.comments || []), comment] }); setDetails({ ...details, comments: [...(details.comments || []), comment] }); setComment(''); flash('Comentário adicionado.') }}>Adicionar comentário</button></div>}</Modal>
    <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.label} message={`Confirma a ação “${pendingAction?.label || ''}” para este registro?`} confirmLabel="Confirmar" onCancel={() => setPendingAction(null)} onConfirm={confirmAction} />
    {saved && <div className="toast">{saved}</div>}
  </DesktopLayout>
}
