// Fachada: as unidades desenhadas como o prédio é (torre → andares → unidades), com a ocupação e o que está pendente.
import { visitorEffectiveStatus } from '../../services/visitantesService.js'

export const UNIT_STATES = { OCUPADO: 'oc', LIVRE: 'li', RESERVADO: 're', INATIVO: 'in' }
const byNumber = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true })

// Mesma unidade = mesma torre e mesmo número (os registros operacionais referenciam a unidade assim)
export function unitKey(tower, number) {
  return `${String(tower || '').trim().toLowerCase()}|${String(number || '').trim().toLowerCase()}`
}

// Andar da unidade: o que a API informa (andar); sem ele, o padrão 101/1204 dos prédios (andar + dois dígitos).
// Casas (modelo horizontal) e números fora do padrão ficam sem andar.
export function unitFloor(unit, model = '') {
  if (Number.isInteger(unit.floor)) return unit.floor
  if (model === 'HORIZONTAL') return null
  const match = /^(\d{1,2})(\d{2})$/.exec(String(unit.number || '').trim())
  return match ? Number(match[1]) : null
}

// O que está esperando por unidade: encomenda na portaria, reserva aguardando aprovação ou pagamento,
// chamado aberto e visita aguardando autorização
export function unitActivity(data, now = new Date()) {
  const activity = new Map()
  const add = (record, kind) => {
    if (!record.unit) return
    const key = unitKey(record.tower, record.unit)
    if (!activity.has(key)) activity.set(key, [])
    activity.get(key).push({ kind, record })
  }
  ;(data.packages || []).filter((item) => item.status === 'AGUARDANDO_RETIRADA' && !item.noRecipient).forEach((item) => add(item, 'package'))
  ;(data.reservations || []).filter((item) => ['AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO'].includes(item.status)).forEach((item) => add(item, 'reservation'))
  ;(data.tickets || []).filter((item) => item.status === 'ABERTO').forEach((item) => add(item, 'ticket'))
  ;(data.visitors || []).filter((item) => visitorEffectiveStatus(item, now) === 'PENDENTE').forEach((item) => add(item, 'visitor'))
  return activity
}

export function buildFacade(units = [], { model = '', activity = new Map() } = {}) {
  const towers = new Map()
  for (const unit of units) {
    const name = unit.tower || ''
    if (!towers.has(name)) towers.set(name, [])
    towers.get(name).push(unit)
  }
  return [...towers.entries()].sort(([a], [b]) => byNumber(a, b)).map(([name, list]) => {
    const floors = new Map()
    const loose = []
    for (const unit of list) {
      const cell = { id: unit.id, number: unit.number, status: unit.status, state: UNIT_STATES[unit.status] || 'li', pending: (activity.get(unitKey(unit.tower, unit.number)) || []).length, unit }
      const floor = unitFloor(unit, model)
      if (floor === null) loose.push(cell)
      else {
        if (!floors.has(floor)) floors.set(floor, [])
        floors.get(floor).push(cell)
      }
    }
    const floorRows = [...floors.entries()].sort(([a], [b]) => b - a).map(([floor, cells]) => ({ floor, cells: cells.sort((a, b) => byNumber(a.number, b.number)) }))
    loose.sort((a, b) => byNumber(a.number, b.number))
    const widest = Math.max(0, ...floorRows.map((row) => row.cells.length))
    return {
      name,
      floors: floorRows,
      loose,
      columns: Math.max(1, widest, loose.length ? Math.min(loose.length, 8) : 0),
      total: list.length,
      occupied: list.filter((unit) => unit.status === 'OCUPADO').length,
      pending: list.filter((unit) => (activity.get(unitKey(unit.tower, unit.number)) || []).length).length,
    }
  })
}

// Contagens dos filtros da tela de Unidades
export function facadeSummary(units = [], activity = new Map()) {
  const count = (status) => units.filter((unit) => unit.status === status).length
  return {
    total: units.length,
    OCUPADO: count('OCUPADO'), LIVRE: count('LIVRE'), RESERVADO: count('RESERVADO'), INATIVO: count('INATIVO'),
    pending: units.filter((unit) => (activity.get(unitKey(unit.tower, unit.number)) || []).length).length,
  }
}
