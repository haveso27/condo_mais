import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import DesktopLayout from '../../layouts/DesktopLayout'
import { desktopData } from '../../mocks/desktopData'

function toneFor(value = '') {
  if (/urgente|alta|cancelada|inativo/i.test(value)) return 'red'
  if (/pendente|aguardando|rascunho|aberto/i.test(value)) return 'pink'
  if (/em análise|previsto|agendado|média/i.test(value)) return 'violet'
  return 'green'
}

export default function EntityPage({ role, type }) {
  const config = desktopData[type]
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const rows = useMemo(() => config.rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase())), [config.rows, query])

  return (
    <DesktopLayout role={role}>
      <section className="entity-page">
        <div className="entity-heading"><div><h1>{config.title}</h1><p>{config.subtitle}</p></div>{config.action && <button className="desktop-primary" onClick={() => setOpen(true)}>+ {config.action}</button>}</div>
        {config.notice && <div className="entity-notice">{config.notice}<button>Ver pendências</button></div>}
        <div className="entity-toolbar"><div className="tabs">{config.tabs.map((item, index) => <button className={tab === index ? 'active' : ''} onClick={() => setTab(index)} key={item}>{item}</button>)}</div><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar registros..." /></label></div>
        <div className="table-wrap"><table><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th>Ações</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => { const parts = cell.split('|'); const isStatus = cellIndex === row.length - 1 || /prioridade|status|situação|vínculo/i.test(config.columns[cellIndex]); return <td key={`${cell}-${cellIndex}`}>{isStatus ? <StatusBadge tone={toneFor(cell)}>{cell}</StatusBadge> : <span className="cell-stack"><strong>{parts[0]}</strong>{parts[1] && <small>{parts[1]}</small>}</span>}</td>})}<td><button className="kebab" aria-label="Mais ações">•••</button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-table">Nenhum resultado encontrado.</div>}</div>
        <div className="pagination"><span>Mostrando {rows.length} de {config.rows.length * 5} registros</span><div><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></div>
      </section>
      <Modal open={open} title={config.action || 'Novo registro'} onClose={() => setOpen(false)} onConfirm={() => { setOpen(false); setSaved(true); setTimeout(() => setSaved(false), 2500) }} confirmLabel={type.includes('encomendas') ? 'Registrar' : 'Salvar'}>
        <div className="form-grid"><label>Nome / identificação<input placeholder="Digite a identificação" /></label><label>Torre / Bloco<select defaultValue=""><option value="" disabled>Selecione</option><option>Torre A</option><option>Torre B</option><option>Torre C</option></select></label><label>Unidade<input placeholder="Ex.: 203" /></label><label>Observação<textarea placeholder="Informações adicionais (opcional)" /></label></div>
      </Modal>
      {saved && <div className="toast">Registro salvo com sucesso.</div>}
    </DesktopLayout>
  )
}
