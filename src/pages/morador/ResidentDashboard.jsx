import { AlertTriangle, CalendarDays, ChevronRight, Megaphone, Package, UserRound, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadNotice from '../../components/LoadNotice'
import Modal from '../../components/Modal'
import { loadState } from '../../features/dashboard/dashboardData'
import { confirmationMessage } from '../../config/uiPresentation'
import { useAppData } from '../../context/AppDataContext'
import { unitFloor } from '../../features/facade/facadeData'
import { residentFeed } from '../../features/morador/residentFeed'
import ResidentLayout from '../../layouts/ResidentLayout'

const icons = { package: Package, visitor: UserRound, ticket: Wrench, payment: CalendarDays, reservation: CalendarDays, notice: Megaphone }
// Itens que pedem atenção levam o selo +; os demais são só informação
const fresh = ['approval', 'package', 'visitor', 'ticket', 'payment']

// O prédio em miniatura com o apartamento aceso: "você mora aqui"
function MiniTower({ unit }) {
  const floor = unitFloor(unit)
  const position = Number(String(unit.number || '').slice(-2))
  const litFloor = Number.isInteger(floor) && floor > 0 ? Math.min(floor, 8) : null
  const litColumn = position > 0 ? ((position - 1) % 4) + 1 : null
  const cells = []
  for (let row = 8; row >= 1; row -= 1) for (let column = 1; column <= 4; column += 1) cells.push(<i key={`${row}-${column}`} className={row === litFloor && column === litColumn ? 'acesa' : undefined} />)
  return <span className="mini-torre" aria-hidden="true">{cells}</span>
}

function packageCodeClass(code = '') {
  return code.length > 6 ? 'codigo codigo--longo' : 'codigo'
}

export default function ResidentDashboard() {
  const navigate = useNavigate()
  const { data, actions, remote } = useAppData()
  const resident = data.currentResident
  const remoteTickets = Boolean(remote?.tickets && remote.tickets.status !== 'idle')
  const remoteReservations = Boolean(remote?.reservations && remote.reservations.status !== 'idle')
  const { urgent: urgentNotice, items } = residentFeed(data, { remoteTickets })
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [parcel, setParcel] = useState(null)
  const [feedback, setFeedback] = useState('')
  const feedState = loadState(remote, ['packages', 'reservations', 'visitors', 'tickets', 'notices'])
  const ownUnit = (data.units || []).find((unit) => unit.id && unit.id === resident.unitId) || { number: resident.unit, floor: null }
  const flash = (message) => { setFeedback(message); setTimeout(() => setFeedback(''), 2600) }

  function open(item) {
    if (item.kind === 'package') return setParcel(item.record)
    if (item.kind === 'notice') { const notice = item.record; return navigate(`/morador/comunicados/${encodeURIComponent(notice.id)}`) }
    if (item.kind === 'visitor') return navigate('/morador/visitantes')
    if (item.kind === 'ticket') return navigate('/morador/chamados')
    return navigate('/morador/reservas')
  }

  async function confirm() {
    if (busy || !pending) return
    const { record, status } = pending
    setBusy(true)
    try {
      if (remoteReservations) await actions.setReservationStatusRemote(record.id, status)
      else actions.setReservationStatus(record.id, status)
      flash(status === 'CONFIRMADA' ? 'Reserva aprovada.' : 'Reserva recusada.')
    } catch (actionError) {
      flash(actionError.message)
    } finally {
      setBusy(false); setPending(null)
    }
  }

  return (
    <ResidentLayout>
      <section className="resident-page resident-page--dashboard inicio">
        <header className="inicio__eu">
          <MiniTower unit={ownUnit} />
          <div><small>Olá, {resident.name.split(' ')[0]}</small><h1>Apartamento {resident.unit}{resident.tower ? ` · ${resident.tower}` : ''}</h1></div>
        </header>
        {urgentNotice && <button className="urgent-alert" onClick={() => navigate(`/morador/comunicados/${encodeURIComponent(urgentNotice.id)}`)}><AlertTriangle aria-hidden="true" /><span><small>Urgente</small><strong>{urgentNotice.title}</strong><em>Ver detalhes</em></span></button>}
        <div className="inicio__sec"><h2>Para o {resident.unit || 'seu apartamento'}</h2><span>{items.length} {items.length === 1 ? 'novidade' : 'novidades'}</span></div>
        <div className="feed">
          {items.map((item) => {
            const Icon = icons[item.kind]
            const mark = fresh.includes(item.kind) ? <span className="selo" aria-hidden="true">+</span> : <span className="feed__icone" aria-hidden="true"><Icon size={17} /></span>
            if (item.kind === 'approval') return <div className="item" key={item.id}>{mark}<div className="item__texto"><strong>{item.title}</strong><small>{item.text}</small>
              <div className="item__bt"><button type="button" className="secondary-button btn-sm" onClick={() => setPending({ record: item.record, status: 'CONFIRMADA', label: 'Aprovar reserva' })}>Aprovar</button><button type="button" className="danger-button btn-sm" onClick={() => setPending({ record: item.record, status: 'RECUSADA', label: 'Recusar reserva' })}>Recusar</button></div></div></div>
            return <button type="button" className="item item--link" key={item.id} onClick={() => open(item)}>{mark}<span className="item__texto"><strong>{item.title}</strong><small>{item.text}</small></span><ChevronRight size={16} aria-hidden="true" /></button>
          })}
          {(!items.length || feedState.errors.length > 0) && <LoadNotice state={feedState} empty={items.length ? null : <p className="dashboard-empty">Nada novo para a sua unidade por enquanto.</p>} />}
        </div>
        <div className="inicio__acoes">
          <button className="wide-action" onClick={() => navigate('/morador/visitantes', { state: { create: true } })}>Autorizar visita</button>
          <div className="quick-actions"><button onClick={() => navigate('/morador/reservas', { state: { create: true } })}>Reservar área</button><button onClick={() => navigate('/morador/chamados', { state: { create: true } })}>Abrir chamado</button></div>
        </div>
      </section>
      <Modal open={Boolean(parcel)} title="Sua encomenda chegou" onClose={() => setParcel(null)}>
        {parcel && <div className="encomenda">
          <p className="muted">Está na portaria{parcel.receivedAt ? ` desde ${parcel.receivedAt}` : ''}.</p>
          {parcel.code && <div className={packageCodeClass(parcel.code)}><small>Código da encomenda</small><b>{parcel.code}</b><span>Na portaria, informe o nome de quem vai retirar.</span></div>}
          <dl className="dados">
            {parcel.resident && <div><dt>Para</dt><dd>{parcel.resident}</dd></div>}
            {parcel.doorman && <div><dt>Recebida por</dt><dd>{parcel.doorman}</dd></div>}
            <div><dt>Unidade</dt><dd>{[parcel.tower, parcel.unit && `apto ${parcel.unit}`].filter(Boolean).join(', ')}</dd></div>
          </dl>
          <ol className="linha-tempo"><li className="ok"><strong>Chegou na portaria</strong>{parcel.receivedAt && <small>{parcel.receivedAt}</small>}</li><li><strong>Retirada</strong><small>Ainda não</small></li></ol>
        </div>}
      </Modal>
      <ConfirmDialog open={Boolean(pending)} title={pending?.label} message={confirmationMessage(pending?.record, pending?.label, pending?.status)} confirmLabel={busy ? 'Aguarde...' : pending?.label || 'Confirmar'} destructive={pending?.status === 'RECUSADA'} busy={busy} onCancel={() => setPending(null)} onConfirm={confirm} />
      <div role="status" aria-live="polite" aria-atomic="true">{feedback && <div className="toast">{feedback}</div>}</div>
    </ResidentLayout>
  )
}
