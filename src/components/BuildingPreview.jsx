import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Hand, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { buildingGeometry, getTowerFloors, getTowerUnitPreview } from '../features/setupWizard/verticalSetup'

const VIEWS = ['Frente', 'Lateral esquerda', 'Fundos', 'Lateral direita']
const INITIAL_VIEW = { angle: -32, tilt: -14 }
const CHIPS_PER_FLOOR = 8

const normalizeAngle = (angle) => ((Math.round(angle) % 360) + 360) % 360
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Algumas janelas "acesas" para o prédio não parecer chapado; o padrão é fixo para não piscar ao re-renderizar
function windowColor(floor, index, selected) {
  if (selected) return { bg: '#51B548', fg: '#0B2A53' }
  return (floor * 7 + index * 3) % 5 === 0 ? { bg: '#F4E6B8', fg: '#0B2A53' } : { bg: '#1F4677', fg: '#C3D3E6' }
}

// Faixa de janelas de um andar desenhada por CSS (configurações grandes e fachadas sem números)
function stripe(color, cell, gap) {
  const glass = Math.max(1, cell - gap)
  return `repeating-linear-gradient(90deg, ${color} 0 ${glass}px, transparent ${glass}px ${cell}px)`
}

function prefersReducedMotion() {
  try { return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) } catch { return false }
}

// O andar 0 é o térreo (com apartamentos)
const floorName = (floor) => (floor === 0 ? 'Térreo' : `Andar ${floor}`)

export default function BuildingPreview({ tower, totalUnits, towerCount = 1 }) {
  const floors = useMemo(() => getTowerFloors(tower), [tower])
  const preview = getTowerUnitPreview(tower)
  // O térreo com apartamentos é um andar a mais na fachada
  const geometry = buildingGeometry(floors.length || tower.floorCount, tower.unitsPerFloor)
  const [selected, setSelected] = useState(() => floors[0]?.floor ?? 1)
  const [auto, setAuto] = useState(() => !prefersReducedMotion())
  const view = useRef({ ...INITIAL_VIEW })
  const drag = useRef(null)
  const moved = useRef(false)
  const sceneRef = useRef(null)
  const viewLabelRef = useRef(null)
  const rangeRef = useRef(null)

  // A rotação vai direto no estilo da cena: girar não re-renderiza as centenas de janelas
  function applyView(transition = 'none') {
    const { angle, tilt } = view.current
    if (sceneRef.current) {
      sceneRef.current.style.transition = transition
      sceneRef.current.style.transform = `rotateX(${tilt}deg) rotateY(${angle}deg)`
    }
    const normalized = normalizeAngle(angle)
    if (viewLabelRef.current) viewLabelRef.current.textContent = `${VIEWS[Math.round(normalized / 90) % 4]} · ${normalized}°`
    if (rangeRef.current) rangeRef.current.value = String(normalized)
  }

  useEffect(() => { applyView() }, [])

  useEffect(() => {
    if (!auto || typeof window.requestAnimationFrame !== 'function') return undefined
    let frame
    let last = performance.now()
    const tick = (now) => {
      if (!drag.current) {
        view.current.angle += (now - last) * 0.015 // ~15° por segundo
        applyView()
      }
      last = now
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [auto])

  const rotateBy = (degrees) => { setAuto(false); view.current.angle += degrees; applyView('transform 700ms cubic-bezier(.2,.7,.2,1)') }
  const resetView = () => { setAuto(false); view.current = { ...INITIAL_VIEW }; applyView('transform 700ms cubic-bezier(.2,.7,.2,1)') }
  const onSlide = (event) => {
    setAuto(false)
    view.current.angle += (Number(event.target.value) || 0) - normalizeAngle(view.current.angle)
    applyView()
  }

  const onPointerDown = (event) => {
    drag.current = { x: event.clientX, y: event.clientY, ...view.current }
    moved.current = false
    setAuto(false)
  }
  const onPointerMove = (event) => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
    view.current = { angle: drag.current.angle + dx * 0.5, tilt: clamp(drag.current.tilt - dy * 0.2, -38, -4) }
    applyView()
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    setTimeout(() => { moved.current = false }, 0)
  }
  // Soltar o arraste em cima de um andar não conta como clique nele
  const pick = (floor) => { if (!moved.current) setSelected(floor) }

  if (!floors.length) return null

  const first = floors[0].floor
  const last = floors[floors.length - 1].floor
  const current = floors.find((item) => item.floor === selected) || floors[0]
  const range = current.numbers.length > 1 ? `${current.numbers[0]} a ${current.numbers[current.numbers.length - 1]}` : current.numbers[0]
  const floorsDesc = [...floors].reverse()
  const g = geometry
  // Em prédios muito altos não sobra espaçamento: 1px separa um andar do outro
  const rowHeight = Math.max(1, g.floorHeight - g.rowPad * 2 - (g.rowPad === 0 ? 1 : 0))
  const sideCell = Math.max(3, Math.floor((g.depth - g.pad * 2) / g.sideWindows))
  const plate = Math.round(Math.max(g.width, g.depth) * 2)
  const plateInner = Math.round(Math.max(g.width, g.depth) * 1.45)

  const faceRows = (faceKey, cell, count) => floorsDesc.map(({ floor }) => {
    const isSelected = floor === current.floor
    return <div key={`${faceKey}-${floor}`} className="building-row" style={{ height: g.floorHeight, padding: `${g.rowPad}px 0` }}>
      <div style={{ height: rowHeight, width: cell * count, maxWidth: '100%', background: stripe(isSelected ? '#51B548' : '#1F4677', cell, g.gap) }} />
    </div>
  })

  return <div className="building-preview">
    <section className="building-preview__stage-card" aria-label={`Prédio em 3D: ${tower.name.trim() || 'torre'}`}>
      <header className="building-preview__header">
        <div><strong>{tower.name.trim() || 'Torre'}</strong><span className="building-preview__chip">{g.floors} {g.floors === 1 ? 'andar' : 'andares'} · {g.perFloor} por andar</span></div>
        <span className="building-preview__view">Vista: <span ref={viewLabelRef} /></span>
      </header>
      <div className="building-preview__stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="building-preview__floor-badge"><i aria-hidden="true" /><strong>{floorName(current.floor)}</strong><span>{range}</span></div>
        <p className="building-preview__hint"><Hand size={14} aria-hidden="true" /> Arraste para girar · toque em um andar para destacar</p>
        <div ref={sceneRef} className="building-scene" aria-hidden="true" style={{ width: g.width, height: g.height }}>
          <div className="building-plate" style={{ left: (g.width - plate) / 2, top: g.height - plate / 2, width: plate, height: plate }} />
          <div className="building-plate building-plate--inner" style={{ left: (g.width - plateInner) / 2, top: g.height - plateInner / 2, width: plateInner, height: plateInner }} />
          <div className="building-shadow" style={{ top: g.height - (g.depth + 24) / 2, width: g.width + 24, height: g.depth + 24 }} />
          <div className="building-roof" style={{ top: -g.depth / 2, width: g.width, height: g.depth }}><div /></div>

          <div className="building-face building-face--front" style={{ width: g.width, height: g.height, padding: `0 ${g.pad}px`, transform: `translateZ(${g.depth / 2}px)` }}>
            <div className="building-parapet" style={{ height: g.parapet }} />
            {floorsDesc.map(({ floor, numbers }) => {
              const isSelected = floor === current.floor
              return <div key={floor} className="building-row building-row--pick" onClick={() => pick(floor)} style={{ height: g.floorHeight, padding: `${g.rowPad}px 0`, gap: g.gap }}>
                {g.detailedWindows
                  ? numbers.map((number, index) => { const color = windowColor(floor, index, isSelected); return <div key={number} className="building-window" style={{ background: color.bg, color: color.fg, fontSize: g.labelSize }}>{g.showLabels ? number : ''}</div> })
                  : <div style={{ height: rowHeight, width: '100%', background: stripe(isSelected ? '#51B548' : '#1F4677', g.cell, g.gap) }} />}
              </div>
            })}
            <div className="building-lobby" style={{ margin: `0 -${g.pad}px` }}><div className="building-lobby__line" /><div className="building-lobby__base"><span /><b style={{ width: Math.max(24, Math.round(Math.max(g.cell, 20) * 0.9)) }}><i /><i /></b><span /></div></div>
          </div>
          <div className="building-face building-face--back" style={{ width: g.width, height: g.height, padding: `0 ${g.pad}px`, transform: `rotateY(180deg) translateZ(${g.depth / 2}px)` }}>
            <div className="building-parapet" style={{ height: g.parapet }} />{faceRows('back', g.cell, g.perFloor)}<div className="building-base" style={{ margin: `0 -${g.pad}px` }} />
          </div>
          {[90, -90].map((rotation) => <div key={rotation} className="building-face building-face--side" style={{ left: (g.width - g.depth) / 2, width: g.depth, height: g.height, padding: `0 ${g.pad}px`, transform: `rotateY(${rotation}deg) translateZ(${g.width / 2}px)` }}>
            <div className="building-parapet" style={{ height: g.parapet }} />{faceRows(`side${rotation}`, sideCell, g.sideWindows)}<div className="building-base building-base--side" style={{ margin: `0 -${g.pad}px` }} />
          </div>)}
        </div>
      </div>
      <div className="building-preview__controls">
        <button type="button" className="building-icon-button" aria-label="Girar 90 graus para a esquerda" onClick={() => rotateBy(-90)}><RotateCcw size={18} /></button>
        <label className="building-preview__range"><span>Girar</span><input ref={rangeRef} type="range" min="0" max="359" step="1" defaultValue={normalizeAngle(INITIAL_VIEW.angle)} onChange={onSlide} aria-label="Ângulo de rotação do prédio" /></label>
        <button type="button" className="building-icon-button" aria-label="Girar 90 graus para a direita" onClick={() => rotateBy(90)}><RotateCw size={18} /></button>
        <span className="building-preview__divider" aria-hidden="true" />
        <button type="button" className={`building-text-button${auto ? ' is-active' : ''}`} aria-pressed={auto} onClick={() => setAuto((value) => !value)}>{auto ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />} Giro automático</button>
        <button type="button" className="building-text-button" onClick={resetView}>Vista inicial</button>
      </div>
    </section>

    <aside className="building-preview__aside">
      <div className="building-total">
        <div><span>Total previsto</span><p><strong>{totalUnits ?? preview.total}</strong> unidades em {towerCount} {towerCount === 1 ? 'torre' : 'torres'}</p></div>
        <dl>
          <div><dt>Andares</dt><dd>{g.floors}</dd></div>
          <div><dt>Por andar</dt><dd>{g.perFloor}</dd></div>
          <div><dt>Numeração</dt><dd>{preview.first} → {preview.last}</dd></div>
        </dl>
      </div>
      <div className="building-panel building-panel--selected">
        <div className="building-panel__heading">
          <div><span>Andar selecionado</span><strong>{floorName(current.floor)}</strong></div>
          <div className="building-panel__arrows">
            <button type="button" className="building-icon-button" aria-label="Andar abaixo" disabled={current.floor === first} onClick={() => setSelected(Math.max(first, current.floor - 1))}><ChevronDown size={16} /></button>
            <button type="button" className="building-icon-button" aria-label="Andar acima" disabled={current.floor === last} onClick={() => setSelected(Math.min(last, current.floor + 1))}><ChevronUp size={16} /></button>
          </div>
        </div>
        <ul className="building-units" aria-label={`Apartamentos do andar ${current.floor}`}>{current.numbers.map((number) => <li key={number}><small>Apto</small><strong>{number}</strong></li>)}</ul>
      </div>
      <div className="building-panel building-panel--floors">
        <div className="building-panel__title"><strong>Todos os andares</strong><span>Primeira {preview.first} · Última {preview.last}</span></div>
        <div className="building-floor-list">{floorsDesc.map(({ floor, numbers }) => {
          const isSelected = floor === current.floor
          return <button type="button" key={floor} className={isSelected ? 'is-selected' : undefined} aria-pressed={isSelected} onClick={() => setSelected(floor)}>
            <span>Andar {floor}</span>
            <span className="building-floor-list__chips">{numbers.slice(0, CHIPS_PER_FLOOR).map((number) => <em key={number}>{number}</em>)}{numbers.length > CHIPS_PER_FLOOR && <em className="is-more">+{numbers.length - CHIPS_PER_FLOOR}</em>}</span>
          </button>
        })}</div>
      </div>
    </aside>
  </div>
}
