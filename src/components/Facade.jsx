import { statusLabel } from '../services/serviceUtils'

// Fachada do condomínio: cada torre desenhada com os andares; cada unidade é um botão que abre a ficha dela.
// "+" na unidade = algo pendente (encomenda na portaria, reserva para aprovar ou pagar, chamado aberto, visita para autorizar).
export function FacadeLegend() {
  return <div className="legenda" aria-hidden="true"><span><i className="u oc" />Ocupada</span><span><i className="u li" />Livre</span><span><i className="u re" />Reservada</span><span><i className="u in" />Inativa</span><span><i className="mk mk--solto">+</i>Tem algo pendente</span></div>
}

function unitName(cell, towerName) {
  const where = towerName ? `, ${towerName}` : ''
  const pending = cell.pending ? `, ${cell.pending} ${cell.pending === 1 ? 'pendência' : 'pendências'}` : ''
  return `Unidade ${cell.number}${where}, ${statusLabel(cell.status || 'LIVRE').toLowerCase()}${pending}`
}

export default function Facade({ towers, onSelect, selectedId, compact = false, label = 'Fachada do condomínio', emptyTower = 'Edifício' }) {
  const cell = (towerName) => (item) => <button type="button" key={item.id || item.number} className={`u ${item.state}${item.id && item.id === selectedId ? ' sel' : ''}`} title={unitName(item, towerName)} aria-label={unitName(item, towerName)} aria-pressed={item.id && item.id === selectedId ? true : undefined} onClick={() => onSelect?.(item.unit)}><b>{item.number}</b>{item.pending > 0 && <i className="mk" aria-hidden="true">+</i>}</button>
  return <div className="fachada-wrap">
    <div className={`fachada${compact ? ' fachada--compacta' : ''}`} role="group" aria-label={label}>
      {towers.map((tower) => <section className="torre" key={tower.name || '—'} aria-label={tower.name || emptyTower}>
        <div className="torre__casca"><div className="torre__miolo" style={{ '--cols': tower.columns }}>
          {tower.floors.map((row) => <div className="torre__andar" key={row.floor}>{row.cells.map(cell(tower.name))}</div>)}
          {tower.loose.length > 0 && <div className="torre__soltas">{tower.loose.map(cell(tower.name))}</div>}
        </div></div>
        <div className="torre__nome">{tower.name || emptyTower}</div>
        <div className="torre__info">{tower.occupied} de {tower.total} {tower.total === 1 ? 'ocupada' : 'ocupadas'}</div>
      </section>)}
    </div>
  </div>
}
