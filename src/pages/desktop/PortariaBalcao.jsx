import { CheckCheck, LogIn, Package, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadNotice from '../../components/LoadNotice'
import Selo from '../../components/Selo'
import StatusBadge from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import { loadState } from '../../features/dashboard/dashboardData'
import { balcaoSearch, insideNow, packagesOnShelf, visitsTimeline } from '../../features/portaria/balcaoData'
import { statusLabel } from '../../services/serviceUtils'

const SHELF_LIMIT = 6
const TIMELINE_LIMIT = 8

// Balcão da portaria: uma busca só no topo, comandos com atalho, a régua das visitas de hoje e a prateleira
// de encomendas. As ações abrem os mesmos fluxos das telas de Visitantes e Encomendas (com as mesmas regras).
export default function PortariaBalcao() {
  const navigate = useNavigate()
  const { data, remote } = useAppData()
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)
  const now = new Date()
  const timeline = visitsTimeline(data.visitors, now)
  const shelf = packagesOnShelf(data.packages)
  const inside = insideNow(data)
  const results = balcaoSearch(data, query, now)
  const go = (to, state) => navigate(to, state ? { state } : undefined)
  const commands = [
    ['F2', 'Registrar encomenda', Package, () => go('/portaria/encomendas', { create: true })],
    ['F3', 'Registrar visitante', LogIn, () => go('/portaria/visitantes', { create: true })],
    ['F4', 'Registrar retirada', CheckCheck, () => go('/portaria/encomendas', { tab: 'Aguardando retirada' })],
  ]

  useEffect(() => {
    const onKey = (event) => {
      // Com um diálogo aberto, os atalhos ficam quietos
      if (document.querySelector('.modal-backdrop')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); return }
      const command = commands.find(([key]) => key === event.key)
      if (command) { event.preventDefault(); command[3]() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return <section className="dashboard-page balcao">
    <h1 className="sr-only">Balcão da portaria</h1>
    <label className="balcao-busca"><Search size={20} aria-hidden="true" /><span className="sr-only">Buscar no balcão</span><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Quem está no balcão? Nome, CPF, unidade ou código da encomenda" /><span className="kbd" aria-hidden="true">Ctrl K</span></label>
    {query.trim() && <section className="painel balcao__resultados" aria-label="Resultados da busca">
      {results.length ? results.map((item) => <button type="button" key={`${item.kind}-${item.id}`} className="resultado" onClick={() => go(item.to, { openId: item.id })}>
        <span className="resultado__tipo">{item.kind === 'package' ? 'Encomenda' : 'Visita'}</span>
        <span className="resultado__texto"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
        <StatusBadge status={item.status}>{statusLabel(item.status)}</StatusBadge>
      </button>) : <p className="painel__vazio">Nada encontrado para “{query.trim()}”.</p>}
    </section>}
    <div className="cmds">{commands.map(([key, label, Icon, run]) => <button type="button" key={key} className="cmd" onClick={run} aria-keyshortcuts={key}><Icon size={16} aria-hidden="true" />{label}<span className="kbd" aria-hidden="true">{key}</span></button>)}</div>
    <div className="hoje__grade">
      <section className="painel" aria-labelledby="balcao-regua">
        <header className="painel__cab"><h2 id="balcao-regua">Régua de hoje</h2><span className="painel__extra">{timeline.rows.length} {timeline.rows.length === 1 ? 'visita' : 'visitas'}</span></header>
        {timeline.rows.length ? <div className="regua">
          <div className="regua__horas" aria-hidden="true"><span /><div className="regua__esc">{timeline.hours.map((hour) => <span key={hour.label} style={{ left: `${hour.left}%` }}>{hour.label}</span>)}</div></div>
          {timeline.rows.slice(0, TIMELINE_LIMIT).map((row) => <button type="button" className="rl" key={row.id} onClick={() => go('/portaria/visitantes', { openId: row.id })} aria-label={`${row.name}, ${row.detail}, ${statusLabel(row.status)}, das ${row.window}`}>
            <span className="rl__quem"><strong>{row.name}</strong><small>{row.detail}</small></span>
            <span className="rl__pista" aria-hidden="true"><span className={`barra ${row.kind}`} style={{ left: `${row.left}%`, width: `${row.width}%` }}>{row.label}</span>{row.outside && <span className="rot-fora" style={{ left: `calc(${row.left + row.width}% + 6px)` }}>{row.outside}</span>}</span>
          </button>)}
          {timeline.now && <div className="agora-linha" style={{ '--agora': timeline.now.left / 100 }} aria-hidden="true"><span>{timeline.now.label}</span></div>}
          {timeline.rows.length > TIMELINE_LIMIT && <button type="button" className="text-link painel__mais" onClick={() => go('/portaria/visitantes')}>Ver todas as {timeline.rows.length} visitas</button>}
        </div> : <LoadNotice state={loadState(remote, ['visitors'])} empty={<p className="painel__vazio">Nenhuma visita prevista para hoje.</p>} />}
      </section>
      <section className="painel" aria-labelledby="balcao-prateleira">
        <header className="painel__cab"><h2 id="balcao-prateleira">Prateleira</h2><Selo count={shelf.length} label={`${shelf.length} ${shelf.length === 1 ? 'encomenda aguardando' : 'encomendas aguardando'} retirada`} /></header>
        {shelf.length ? shelf.slice(0, SHELF_LIMIT).map((item) => <div className={`pacote${item.noRecipient ? ' pacote--sem' : ''}`} key={item.id}>
          {item.noRecipient ? <span className="placa-un placa-un--sem"><small>Sem</small><b>?</b></span> : <span className="placa-un">{item.tower && <small>{item.tower}</small>}<b>{item.unit}</b></span>}
          <span className="pacote__texto"><strong>{item.noRecipient ? 'Sem destinatário' : item.resident}</strong><small>{[item.code, item.receivedAt].filter(Boolean).join(', ')}</small></span>
          <button type="button" className="text-link" onClick={() => go('/portaria/encomendas', { openId: item.id, action: 'pickup' })} aria-label={`Registrar retirada da encomenda ${item.code || ''}`.trim()}>Retirada</button>
        </div>) : <LoadNotice state={loadState(remote, ['packages'])} empty={<p className="painel__vazio">Nenhuma encomenda aguardando retirada.</p>} />}
        {shelf.length > SHELF_LIMIT && <button type="button" className="text-link painel__mais" onClick={() => go('/portaria/encomendas', { tab: 'Aguardando retirada' })}>Ver todas as {shelf.length} encomendas</button>}
      </section>
    </div>
    <div className="dentro"><strong>Dentro agora</strong>{inside.length ? inside.map((item) => <span className="chip" key={`${item.kind}-${item.id}`}>{item.label}</span>) : <span className="muted">Ninguém registrado como presente.</span>}{inside.some((item) => item.kind === 'visitor') && <button type="button" className="text-link" onClick={() => go('/portaria/visitantes', { tab: 'Presentes' })}>Registrar saída</button>}</div>
  </section>
}
