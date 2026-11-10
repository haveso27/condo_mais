export const SETUP_STEPS = [
  'Dados do condomínio',
  'Modelo residencial',
  'Torres',
  'Prévia das unidades',
  'Áreas comuns',
  'Resumo',
]

export const PREDEFINED_COMMON_AREAS = [
  'Salão de Festas',
  'Piscina',
  'Churrasqueira',
  'Academia',
  'Playground',
  'Quadra Esportiva',
  'Espaço Gourmet',
  'Sala de Reuniões',
]

export function createTower(id = 'tower-1') {
  return {
    id,
    name: '',
    floorCount: '1',
    unitsPerFloor: '4',
    firstFloor: '1',
    firstUnit: '1',
    unitDigits: '2',
    separator: '',
  }
}

export const MAX_TOWERS = 30

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Nome sugerido para a próxima torre: continua o padrão já usado (Torre A, B, C… ou Torre 1, 2, 3…)
// e nunca repete um nome existente. A pessoa pode editar a sugestão.
export function suggestTowerName(towers = []) {
  const used = new Set(towers.map((tower) => String(tower.name || '').trim().toLocaleLowerCase('pt-BR')))
  const names = towers.map((tower) => String(tower.name || '').trim())
  const numeric = names.some((name) => /^torre\s+\d+$/i.test(name)) && !names.some((name) => /^torre\s+[a-z]$/i.test(name))
  const numbers = Array.from({ length: MAX_TOWERS + towers.length }, (_, index) => `Torre ${index + 1}`)
  const candidates = numeric ? numbers : [...[...LETTERS].map((letter) => `Torre ${letter}`), ...numbers]
  return candidates.find((name) => !used.has(name.toLocaleLowerCase('pt-BR'))) || ''
}

export function createInitialSetupDraft() {
  return {
    condominium: { name: '', address: '', city: '', state: '' },
    residentialModel: 'VERTICAL',
    towers: [createTower()],
    commonAreas: [],
    customAreas: [],
  }
}

export const SETUP_LIMITS = Object.freeze({
  floorCount: 100,
  unitsPerFloor: 100,
  firstFloor: 999,
  firstUnit: 999,
  unitDigits: 4,
  totalUnits: 5000,
})

export function strictInteger(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const parsed = Number(text)
  return Number.isSafeInteger(parsed) ? parsed : null
}

const normalized = (value) => String(value || '').trim().toLocaleLowerCase('pt-BR')

function towerNumbers(tower) {
  const values = {
    floorCount: strictInteger(tower.floorCount),
    unitsPerFloor: strictInteger(tower.unitsPerFloor),
    firstFloor: strictInteger(tower.firstFloor),
    firstUnit: strictInteger(tower.firstUnit),
    unitDigits: strictInteger(tower.unitDigits),
  }
  if (Object.entries(values).some(([field, value]) => value === null || value < 1 || value > SETUP_LIMITS[field])) return null
  const total = values.floorCount * values.unitsPerFloor
  if (!Number.isSafeInteger(total)) return null
  return { ...values, total }
}

const unitNumber = (tower, floor, sequence) => `${floor}${tower.separator || ''}${String(sequence).padStart(strictInteger(tower.unitDigits), '0')}`

export function getTowerUnitCount(tower) {
  return towerNumbers(tower)?.total || 0
}

export function getTotalUnitCount(towers) {
  let total = 0
  for (const tower of towers) {
    const count = getTowerUnitCount(tower)
    if (!count) return 0
    total += count
    if (!Number.isSafeInteger(total)) return 0
  }
  return total
}

export function getTowerUnitPreview(tower) {
  const values = towerNumbers(tower)
  if (!values || values.total > SETUP_LIMITS.totalUnits) return { total: 0, first: '', last: '' }
  return {
    total: values.total,
    first: unitNumber(tower, values.firstFloor, values.firstUnit),
    last: unitNumber(tower, values.firstFloor + values.floorCount - 1, values.firstUnit + values.unitsPerFloor - 1),
  }
}

export function generateTowerUnits(tower) {
  const values = towerNumbers(tower)
  if (!values || values.total > SETUP_LIMITS.totalUnits) return []
  const { floorCount, unitsPerFloor, firstFloor, firstUnit } = values

  const units = []
  for (let floorOffset = 0; floorOffset < floorCount; floorOffset += 1) {
    const floor = firstFloor + floorOffset
    for (let unitOffset = 0; unitOffset < unitsPerFloor; unitOffset += 1) {
      const sequence = String(firstUnit + unitOffset).padStart(values.unitDigits, '0')
      units.push({
        id: `${tower.id}-${floor}-${sequence}`,
        towerId: tower.id,
        towerName: tower.name.trim(),
        floor,
        number: `${floor}${tower.separator || ''}${sequence}`,
      })
    }
  }
  return units
}

export function generateUnits(towers) {
  const total = getTotalUnitCount(towers)
  if (!total || total > SETUP_LIMITS.totalUnits) return []
  return towers.flatMap(generateTowerUnits)
}

export function summarizeTowerUnits(tower, { maxFloors = 5, maxUnitsPerFloor = 8 } = {}) {
  const values = towerNumbers(tower)
  if (!values || values.total > SETUP_LIMITS.totalUnits) return { total: 0, first: '', last: '', omittedFloors: 0, floors: [] }
  const allFloors = Array.from({ length: values.floorCount }, (_, offset) => values.firstFloor + offset)
  const leadingFloors = Math.ceil(maxFloors / 2)
  const trailingFloors = Math.floor(maxFloors / 2)
  const visibleFloors = allFloors.length <= maxFloors
    ? allFloors
    : [...allFloors.slice(0, leadingFloors), ...allFloors.slice(-trailingFloors)]
  const preview = getTowerUnitPreview(tower)
  return {
    ...preview,
    omittedFloors: Math.max(0, allFloors.length - visibleFloors.length),
    floors: visibleFloors.map((floor) => ({
      floor,
      total: values.unitsPerFloor,
      numbers: Array.from(
        { length: Math.min(values.unitsPerFloor, maxUnitsPerFloor) },
        (_, offset) => unitNumber(tower, floor, values.firstUnit + offset),
      ),
      omittedUnits: Math.max(0, values.unitsPerFloor - maxUnitsPerFloor),
    })),
  }
}

// Todos os andares da torre, do primeiro ao último, com os números de cada um (prévia 3D)
export function getTowerFloors(tower) {
  const values = towerNumbers(tower)
  if (!values || values.total > SETUP_LIMITS.totalUnits) return []
  return Array.from({ length: values.floorCount }, (_, offset) => {
    const floor = values.firstFloor + offset
    return { floor, numbers: Array.from({ length: values.unitsPerFloor }, (_, unit) => unitNumber(tower, floor, values.firstUnit + unit)) }
  })
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

// Medidas do prédio da prévia 3D. Cabe num palco de ~380px de altura e ~300px de largura para qualquer
// configuração permitida (até 100 andares x 100 por andar): andares e janelas encolhem, e os números
// só aparecem nas janelas quando há espaço para ler.
export function buildingGeometry(floorCount, unitsPerFloor) {
  const floors = clamp(strictInteger(floorCount) || 1, 1, SETUP_LIMITS.floorCount)
  const perFloor = clamp(strictInteger(unitsPerFloor) || 1, 1, SETUP_LIMITS.unitsPerFloor)
  const floorHeight = clamp(Math.floor(380 / (floors + 1.6)), 3, 30)
  const cell = clamp(Math.floor(280 / perFloor), 3, 46)
  const pad = 10
  const gap = floorHeight >= 16 ? 5 : floorHeight >= 8 ? 2 : 1
  const rowPad = floorHeight >= 16 ? 4 : floorHeight >= 8 ? 2 : 0
  const width = perFloor * cell + pad * 2
  const sideWindows = clamp(Math.ceil(perFloor / 2), 1, 6)
  const depth = clamp(sideWindows * Math.max(cell, 20) + pad * 2, 70, Math.max(width, 70))
  const parapet = 10
  const lobby = clamp(Math.round(floorHeight * 1.6), 20, 42)
  return {
    floors, perFloor, floorHeight, cell, pad, gap, rowPad, width, depth, parapet, lobby, sideWindows,
    height: parapet + floors * floorHeight + lobby,
    showLabels: floorHeight >= 17 && cell >= 30,
    labelSize: clamp(Math.floor(Math.min(floorHeight * 0.48, cell * 0.27)), 8, 11),
    // Janelas individuais só enquanto o DOM fica leve; acima disso cada andar vira uma faixa desenhada por CSS
    detailedWindows: floors * perFloor <= 1200,
  }
}

export function summarizeUnitsByFloor(units, { maxFloors = 5, maxUnitsPerFloor = 8 } = {}) {
  const groups = [...units.reduce((map, unit) => {
    if (!map.has(unit.floor)) map.set(unit.floor, [])
    map.get(unit.floor).push(unit)
    return map
  }, new Map()).entries()].map(([floor, floorUnits]) => ({ floor, units: floorUnits }))
  const visible = groups.length <= maxFloors ? groups : [...groups.slice(0, 3), ...groups.slice(-2)]
  return {
    omittedFloors: Math.max(0, groups.length - visible.length),
    floors: visible.map((group) => ({
      floor: group.floor,
      total: group.units.length,
      numbers: group.units.slice(0, maxUnitsPerFloor).map((unit) => unit.number),
      omittedUnits: Math.max(0, group.units.length - maxUnitsPerFloor),
    })),
  }
}

function validatePositiveInteger(value, label, maximum) {
  const parsed = strictInteger(value)
  if (parsed === null || parsed < 1) return `${label} deve ser um número inteiro maior que zero.`
  if (maximum && parsed > maximum) return `${label} deve ser no máximo ${maximum}.`
  return ''
}

export function validateTowerDetails(towers) {
  if (!towers.length) return [{ message: 'Adicione pelo menos uma torre.' }]
  const errors = []
  const names = new Set()
  towers.forEach((tower, index) => {
    const label = tower.name.trim() || `Torre ${index + 1}`
    if (!tower.name.trim()) errors.push({ field: `tower.${tower.id}.name`, message: `Informe o nome da Torre ${index + 1}.` })
    else if (names.has(normalized(tower.name))) errors.push({ field: `tower.${tower.id}.name`, message: `O nome “${tower.name.trim()}” está repetido.` })
    else names.add(normalized(tower.name))
    for (const [field, error] of [
      ['floorCount', validatePositiveInteger(tower.floorCount, `Quantidade de andares de ${label}`, SETUP_LIMITS.floorCount)],
      ['unitsPerFloor', validatePositiveInteger(tower.unitsPerFloor, `Apartamentos por andar de ${label}`, SETUP_LIMITS.unitsPerFloor)],
      ['firstFloor', validatePositiveInteger(tower.firstFloor, `Primeiro andar de ${label}`, SETUP_LIMITS.firstFloor)],
      ['firstUnit', validatePositiveInteger(tower.firstUnit, `Primeiro apartamento de ${label}`, SETUP_LIMITS.firstUnit)],
      ['unitDigits', validatePositiveInteger(tower.unitDigits, `Quantidade de dígitos de ${label}`, SETUP_LIMITS.unitDigits)],
    ]) if (error) errors.push({ field: `tower.${tower.id}.${field}`, message: error })
  })
  if (!errors.length && getTotalUnitCount(towers) > SETUP_LIMITS.totalUnits) errors.push({ message: 'A prévia está limitada a 5.000 unidades por configuração.' })
  return errors
}

export const validateTowers = (towers) => validateTowerDetails(towers).map((error) => error.message)

export function duplicateUnits(units) {
  const seen = new Set()
  const duplicates = new Set()
  units.forEach((unit) => {
    const key = `${unit.towerId}:${normalized(unit.number)}`
    if (seen.has(key)) duplicates.add(`${unit.towerName} · ${unit.number}`)
    seen.add(key)
  })
  return [...duplicates]
}

export function validateCommonAreas(draft) {
  const allNames = [...draft.commonAreas, ...draft.customAreas.map((area) => area.name)]
  const seen = new Set()
  const duplicates = []
  allNames.forEach((name) => {
    const key = normalized(name)
    if (!key) return
    if (seen.has(key)) duplicates.push(name.trim())
    seen.add(key)
  })
  return duplicates.length ? [`Remova áreas comuns duplicadas: ${[...new Set(duplicates)].join(', ')}.`] : []
}

export function validateStepDetails(step, draft) {
  if (step === 0) {
    const messages = { name: 'Informe o nome do condomínio.', address: 'Informe o endereço.', city: 'Informe a cidade.', state: 'Informe o estado.' }
    return Object.entries(messages).filter(([key]) => !draft.condominium[key].trim()).map(([key, message]) => ({ field: `condominium.${key}`, message }))
  }
  if (step === 2) return validateTowerDetails(draft.towers)
  if (step === 3) {
    const towerErrors = validateTowerDetails(draft.towers)
    if (towerErrors.length) return towerErrors
    const duplicates = duplicateUnits(generateUnits(draft.towers))
    return duplicates.length ? [{ message: `Existem unidades duplicadas: ${duplicates.join(', ')}.` }] : []
  }
  if (step === 4) return validateCommonAreas(draft).map((message) => ({ message }))
  return []
}

export const validateStep = (step, draft) => validateStepDetails(step, draft).map((error) => error.message)

// Corpo de POST /condominios/configuracao-inicial. Vão os parâmetros de cada torre, não a lista de
// unidades: o backend gera os números com a mesma regra da prévia. O nome do condomínio não vai,
// porque só a administração da plataforma (MASTER) altera nome e CNPJ.
export function buildSetupPayload(draft) {
  const area = (name, reservable) => ({ nome: name.trim(), descricao: null, reservavel: Boolean(reservable), exigeAprovacao: false, capacidade: null })
  return {
    modelo: draft.residentialModel || 'VERTICAL',
    endereco: draft.condominium.address.trim(),
    cidade: draft.condominium.city.trim(),
    estado: draft.condominium.state,
    torres: draft.towers.map((tower) => ({
      nome: tower.name.trim(),
      andares: strictInteger(tower.floorCount),
      unidadesPorAndar: strictInteger(tower.unitsPerFloor),
      andarInicial: strictInteger(tower.firstFloor),
      sequenciaInicial: strictInteger(tower.firstUnit),
      digitos: strictInteger(tower.unitDigits),
      separador: tower.separator || '',
    })),
    // As áreas sugeridas entram sem reserva; as personalizadas seguem a marcação feita na tela.
    // Reserva e aprovação podem ser ajustadas depois, no cadastro de áreas comuns.
    areasComuns: [
      ...draft.commonAreas.map((name) => area(name, false)),
      ...draft.customAreas.map((custom) => area(custom.name, custom.reservable)),
    ],
  }
}

export function wizardReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_CONDOMINIUM':
      return { ...state, draft: { ...state.draft, condominium: { ...state.draft.condominium, [action.field]: action.value } } }
    case 'ADD_TOWER': {
      const nextId = state.nextTowerId + 1
      return { ...state, nextTowerId: nextId, draft: { ...state.draft, towers: [...state.draft.towers, { ...createTower(`tower-${nextId}`), name: suggestTowerName(state.draft.towers) }] } }
    }
    case 'DUPLICATE_TOWER': {
      const index = state.draft.towers.findIndex((tower) => tower.id === action.id)
      if (index < 0 || state.draft.towers.length >= MAX_TOWERS) return state
      const nextId = state.nextTowerId + 1
      // Só a configuração é copiada: a nova torre recebe identidade e nome próprios
      const copy = { ...state.draft.towers[index], id: `tower-${nextId}`, name: suggestTowerName(state.draft.towers) }
      const towers = [...state.draft.towers, copy]
      return { ...state, nextTowerId: nextId, draft: { ...state.draft, towers } }
    }
    case 'SET_TOWER_COUNT': {
      const count = Math.min(MAX_TOWERS, Math.max(1, strictInteger(action.count) || 1))
      let towers = state.draft.towers.slice(0, count)
      let nextId = state.nextTowerId
      while (towers.length < count) {
        nextId += 1
        towers = [...towers, { ...createTower(`tower-${nextId}`), name: suggestTowerName(towers) }]
      }
      return { ...state, nextTowerId: nextId, draft: { ...state.draft, towers } }
    }
    case 'UPDATE_TOWER':
      return { ...state, draft: { ...state.draft, towers: state.draft.towers.map((tower) => tower.id === action.id ? { ...tower, [action.field]: action.value } : tower) } }
    case 'REMOVE_TOWER':
      return { ...state, draft: { ...state.draft, towers: state.draft.towers.filter((tower) => tower.id !== action.id) } }
    case 'TOGGLE_AREA': {
      const selected = state.draft.commonAreas.includes(action.name)
      return { ...state, draft: { ...state.draft, commonAreas: selected ? state.draft.commonAreas.filter((name) => name !== action.name) : [...state.draft.commonAreas, action.name] } }
    }
    case 'ADD_CUSTOM_AREA':
      return { ...state, draft: { ...state.draft, customAreas: [...state.draft.customAreas, action.area] } }
    case 'REMOVE_CUSTOM_AREA':
      return { ...state, draft: { ...state.draft, customAreas: state.draft.customAreas.filter((area) => area.id !== action.id) } }
    case 'GO_TO_STEP':
      return { ...state, step: action.step, maxVisited: Math.max(state.maxVisited, action.step), reviewed: false }
    case 'SET_REVIEWED':
      return { ...state, reviewed: true }
    default:
      return state
  }
}

export function createInitialWizardState() {
  const draft = createInitialSetupDraft()
  draft.towers = [{ ...draft.towers[0], name: suggestTowerName([]) }]
  return { step: 0, maxVisited: 0, nextTowerId: 1, reviewed: false, draft }
}
