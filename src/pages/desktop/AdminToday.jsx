import { CalendarClock, Headphones, Package } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import Facade, { FacadeLegend } from '../../components/Facade'
import LoadNotice from '../../components/LoadNotice'
import Selo from '../../components/Selo'
import StatusBadge from '../../components/StatusBadge'
import { confirmationMessage } from '../../config/uiPresentation'
import { useAppData } from '../../context/AppDataContext'
import { adminCounters, loadState, pendingActions, todaysReservations } from '../../features/dashboard/dashboardData'
import { buildFacade, unitActivity } from '../../features/facade/facadeData'
import { statusLabel } from '../../services/serviceUtils'

const counterIcons = { packages: Package, reservations: CalendarClock, tickets: Headphones }
const doneMessages = { CONFIRMADA: 'Reserva aprovada.', RECUSADA: 'Reserva recusada.', PAGAMENTO_CONFIRMADO: 'Pagamento confirmado. A reserva está confirmada.' }
const actionBadges = {
  approval: ['AGUARDANDO_APROVACAO', 'Aguardando aprovação'], payment: ['AGUARDANDO_PAGAMENTO', 'Aguardando pagamento'],
  ticket: ['ABERTO', 'Aberto'], notice: ['EM_ANALISE', 'Vence hoje'],
}

// "Hoje" da administração: contadores com ícone (o que chegou de novo), a fachada com ocupação e pendências,
// as reservas do dia e o que só a administração resolve, com a ação de cada item
export default function AdminToday() {
  const navigate = useNavigate()
  const { data, actions, remote } = useAppData()
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const now = new Date()
  const counters = adminCounters(data, now)
  const towers = buildFacade(data.units, { model: data.condominium.model, activity: unitActivity(data, now) })
  const todo = pendingActions(data, now)
  const today = todaysReservations(data, now)
  const occupied = data.units.filter((unit) => unit.status === 'OCUPADO').length
  const remoteReservations = Boolean(remote?.reservations && remote.reservations.status !== 'idle')
  const unitsState = remote?.units
  const panelState = loadState(remote, ['packages', 'reservations', 'tickets', 'notices'])
  const reservationsState = loadState(remote, ['reservations'])
  const flash = (message) => { setFeedback(message); setTimeout(() => setFeedback(''), 2600) }

  async function confirm() {
    if (busy || !pending) return
    const { record, status } = pending
    setBusy(true)
    try {
      if (remoteReservations) await actions.setReservationStatusRemote(record.id, status)
      else actions.setReservationStatus(record.id, status === 'PAGAMENTO_CONFIRMADO' ? 'CONFIRMADA' : status)
      flash(doneMessages[status] || 'Reserva atualizada.')
    } catch (error) {
      flash(error.message)
    } finally {
      setBusy(false); setPending(null)
    }
  }

  function itemButtons(item) {
    if (item.kind === 'approval') return <><button type="button" className="primary-button btn-sm" onClick={() => setPending({ record: item.record, status: 'CONFIRMADA', label: 'Aprovar reserva' })}>Aprovar</button><button type="button" className="danger-button btn-sm" onClick={() => setPending({ record: item.record, status: 'RECUSADA', label: 'Recusar reserva' })}>Recusar</button></>
    if (item.kind === 'payment') return <button type="button" className="secondary-button btn-sm" onClick={() => setPending({ record: item.record, status: 'PAGAMENTO_CONFIRMADO', label: 'Confirmar pagamento' })}>Confirmar pagamento</button>
    if (item.kind === 'ticket') return <button type="button" className="secondary-button btn-sm" onClick={() => navigate('/admin/chamados', { state: { openId: item.record.id } })}>Ver chamado</button>
    return <button type="button" className="text-link" onClick={() => navigate('/admin/comunicados', { state: { openId: item.record.id } })}>Ver comunicado</button>
  }

  return <section className="dashboard-page hoje">
    <h1 className="hoje__titulo">Hoje</h1>
    <div className="contadores">{counters.map(({ key, count, label, to }) => {
      const Icon = counterIcons[key]
      const loading = panelState.loading && !count
      return <button type="button" key={key} className={`contador${count ? ' contador--ativo' : ''}`} aria-label={loading ? `Carregando ${label}` : `${count} ${label}`} onClick={() => navigate(to)}>
        <span className="contador__icone"><Icon size={20} aria-hidden="true" />{count > 0 && <i className="mk" aria-hidden="true">+</i>}</span>
        <strong aria-hidden="true">{loading ? '…' : count}</strong><span className="contador__rotulo" aria-hidden="true">{label}</span>
      </button>
    })}</div>
    <div className="hoje__grade">
      <div className="pilha">
        <section className="painel" aria-labelledby="hoje-fachada">
          <header className="painel__cab"><h2 id="hoje-fachada">Fachada</h2><span className="painel__extra">{data.units.length} {data.units.length === 1 ? 'unidade' : 'unidades'}, {occupied} {occupied === 1 ? 'ocupada' : 'ocupadas'}</span></header>
          {unitsState?.status === 'loading' ? <p className="painel__vazio" role="status">Carregando unidades...</p>
            : unitsState?.status === 'error' ? <p className="painel__vazio" role="alert">{unitsState.error} <button type="button" className="text-link" onClick={() => actions.reloadCadastros()}>Tentar novamente</button></p>
              : towers.length ? <><Facade compact towers={towers} onSelect={(unit) => navigate('/admin/unidades', { state: { openId: unit.id } })} /><FacadeLegend /></>
                : <p className="painel__vazio">Nenhuma unidade cadastrada ainda. <button type="button" className="text-link" onClick={() => navigate('/admin/unidades')}>Ir para Unidades</button></p>}
        </section>
        <section className="painel" aria-labelledby="hoje-reservas">
          <header className="painel__cab"><h2 id="hoje-reservas">Reservas de hoje</h2><span className="painel__extra">{today.length}</span></header>
          {today.length ? today.map((item) => <div className="res" key={item.id}><span className="res__h">{item.startTime}–{item.endTime}</span><div><strong>{item.area}</strong><small>{[item.resident, [item.tower, item.unit].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</small></div><StatusBadge status={item.status}>{statusLabel(item.status)}</StatusBadge></div>)
            : <LoadNotice state={reservationsState} empty={<p className="painel__vazio">Nenhuma reserva para hoje.</p>} />}
        </section>
      </div>
      <section className="painel" aria-labelledby="hoje-acao">
        <header className="painel__cab"><h2 id="hoje-acao">Pede sua ação</h2><Selo count={todo.length} label={`${todo.length} ${todo.length === 1 ? 'item pede' : 'itens pedem'} sua ação`} /></header>
        {todo.map((item) => {
          const [status, badge] = actionBadges[item.kind]
          return <article className="acao" key={item.id}>
            <StatusBadge status={status}>{badge}</StatusBadge>
            <strong>{item.title}</strong>{item.subtitle && <p>{item.subtitle}</p>}
            <div className="acao__bt">{itemButtons(item)}</div>
          </article>
        })}
        {(!todo.length || panelState.errors.length > 0) && <LoadNotice state={panelState} empty={todo.length ? null : <p className="painel__vazio">Nada pendente agora.</p>} />}
      </section>
    </div>
    <ConfirmDialog open={Boolean(pending)} title={pending?.label} message={confirmationMessage(pending?.record, pending?.label, pending?.status)} destructive={pending?.status === 'RECUSADA'} busy={busy} confirmLabel={busy ? 'Aguarde...' : pending?.label || 'Confirmar'} onCancel={() => setPending(null)} onConfirm={confirm} />
    <div role="status" aria-live="polite" aria-atomic="true">{feedback && <div className="toast">{feedback}</div>}</div>
  </section>
}
