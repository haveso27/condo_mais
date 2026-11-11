import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GROUND_WITH_UNITS,
  SETUP_LIMITS,
  buildSetupPayload,
  getTowerFloors,
  createInitialWizardState,
  createTower,
  duplicateUnits,
  generateTowerUnits,
  generateUnits,
  getTotalUnitCount,
  getTowerUnitCount,
  getTowerUnitPreview,
  strictInteger,
  summarizeTowerUnits,
  summarizeUnitsByFloor,
  validateCommonAreas,
  validateStep,
  validateStepDetails,
  validateTowers,
  wizardReducer,
} from '../src/features/setupWizard/verticalSetup.js'

const validTower = (changes = {}) => ({ ...createTower('tower-a'), name: 'Torre A', floorCount: '3', unitsPerFloor: '2', firstFloor: '1', firstUnit: '1', unitDigits: '2', ...changes })

test('gera unidades por andar com numeração configurável', () => {
  const units = generateTowerUnits(validTower())
  assert.equal(units.length, 6)
  assert.deepEqual(units.map((unit) => unit.number), ['101', '102', '201', '202', '301', '302'])
  assert.deepEqual(units.map((unit) => unit.floor), [1, 1, 2, 2, 3, 3])
  const separated = generateTowerUnits(validTower({ floorCount: '1', firstFloor: '4', firstUnit: '7', unitDigits: '3', separator: '-' }))
  assert.deepEqual(separated.map((unit) => unit.number), ['4-007', '4-008'])
})

test('múltiplas torres preservam contexto e permitem números iguais entre torres', () => {
  const towers = [validTower(), validTower({ id: 'tower-b', name: 'Torre B' })]
  const units = generateUnits(towers)
  assert.equal(units.length, 12)
  assert.equal(getTotalUnitCount(towers), 12)
  assert.equal(units.filter((unit) => unit.number === '101').length, 2)
  assert.deepEqual(duplicateUnits(units), [])
})

test('rejeita a representação completa de inteiros inválidos sem conversão parcial', () => {
  for (const value of ['2.5', '3.7', '1e2', '3abc', '-1', '', 'Infinity', Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(strictInteger(value), null, `deveria rejeitar ${String(value)}`)
  }
  assert.equal(strictInteger('002'), 2)
  assert.equal(strictInteger(100), 100)
})

test('rejeita limites, valores perigosos e entradas inválidas antes de gerar unidades', () => {
  const invalidTowers = [
    validTower({ floorCount: String(SETUP_LIMITS.floorCount + 1) }),
    validTower({ unitsPerFloor: String(SETUP_LIMITS.unitsPerFloor + 1) }),
    validTower({ floorCount: '999999999999999999999999999999' }),
    validTower({ floorCount: '-3' }),
    validTower({ floorCount: '0' }),
    validTower({ floorCount: '2.5' }),
    validTower({ floorCount: '1e2' }),
    validTower({ floorCount: 'sem número' }),
    validTower({ floorCount: Infinity }),
  ]

  for (const tower of invalidTowers) {
    assert.ok(validateTowers([tower]).length > 0)
    assert.equal(getTowerUnitCount(tower), 0)
    assert.deepEqual(getTowerUnitPreview(tower), { total: 0, first: '', last: '' })
    assert.deepEqual(generateTowerUnits(tower), [])
    assert.deepEqual(summarizeTowerUnits(tower).floors, [])
  }
})

test('aceita os limites permitidos e preserva a numeração personalizada', () => {
  const tower = validTower({
    floorCount: '100',
    unitsPerFloor: '50',
    firstFloor: '999',
    firstUnit: '999',
    unitDigits: '4',
    separator: '-',
  })
  const preview = getTowerUnitPreview(tower)
  assert.deepEqual(preview, { total: 5000, first: '999-0999', last: '1098-1048' })
  assert.deepEqual(validateTowers([tower]), [])
  assert.equal(getTowerUnitCount(tower), 5000)
  assert.equal(generateTowerUnits(tower).length, 5000)
})

test('calcula totais aritmeticamente e bloqueia a materialização acima do limite global', () => {
  const towers = [
    validTower({ floorCount: '50', unitsPerFloor: '60' }),
    validTower({ id: 'tower-b', name: 'Torre B', floorCount: '50', unitsPerFloor: '60' }),
  ]
  assert.equal(getTotalUnitCount(towers), 6000)
  assert.match(validateTowers(towers).join(' '), /5\.000 unidades/)
  assert.deepEqual(generateUnits(towers), [])
})

test('bloqueia nomes de torres repetidos e valores inválidos', () => {
  assert.match(validateTowers([validTower(), validTower({ id: 'tower-b', name: ' torre a ' })]).join(' '), /repetido/i)
  const errors = validateTowers([validTower({ floorCount: '0', unitsPerFloor: 'abc', unitDigits: '5' })])
  assert.ok(errors.some((error) => /maior que zero/i.test(error)))
  assert.ok(errors.some((error) => /no máximo 4/i.test(error)))
})

test('valida dados obrigatórios e duplicidade de áreas personalizadas', () => {
  const state = createInitialWizardState()
  assert.equal(validateStep(0, state.draft).length, 4)
  const details = validateStepDetails(0, state.draft)
  assert.deepEqual(details.map((error) => error.field), ['condominium.name', 'condominium.address', 'condominium.city', 'condominium.state'])
  assert.equal(details[2].message, 'Informe a cidade.')
  const draft = { ...state.draft, commonAreas: ['Piscina'], customAreas: [{ id: '1', name: ' piscina ' }] }
  assert.match(validateCommonAreas(draft)[0], /duplicadas/i)
})

test('resume prévia extensa sem alterar totais nem exemplos reais', () => {
  const units = generateTowerUnits(validTower({ floorCount: '10', unitsPerFloor: '20' }))
  const summary = summarizeUnitsByFloor(units)
  assert.equal(units.length, 200)
  assert.equal(summary.floors.length, 5)
  assert.equal(summary.omittedFloors, 5)
  assert.deepEqual(summary.floors.map((group) => group.floor), [1, 2, 3, 9, 10])
  assert.equal(summary.floors[0].numbers[0], '101')
  assert.equal(summary.floors[0].numbers.length, 8)
  assert.equal(summary.floors[0].omittedUnits, 12)
})

test('resume a prévia diretamente da configuração sem materializar apartamentos', () => {
  const summary = summarizeTowerUnits(validTower({ floorCount: '10', unitsPerFloor: '20', separator: '-' }))
  assert.equal(summary.total, 200)
  assert.equal(summary.first, '1-01')
  assert.equal(summary.last, '10-20')
  assert.deepEqual(summary.floors.map((group) => group.floor), [1, 2, 3, 9, 10])
  assert.equal(summary.floors[0].numbers.length, 8)
  assert.equal(summary.floors[0].omittedUnits, 12)
})

test('reducer preserva dados ao navegar e mantém estado isolado', () => {
  let state = createInitialWizardState()
  state = wizardReducer(state, { type: 'UPDATE_CONDOMINIUM', field: 'name', value: 'Condomínio Teste' })
  state = wizardReducer(state, { type: 'UPDATE_TOWER', id: 'tower-1', field: 'name', value: 'Torre Norte' })
  state = wizardReducer(state, { type: 'GO_TO_STEP', step: 3 })
  state = wizardReducer(state, { type: 'GO_TO_STEP', step: 1 })
  assert.equal(state.draft.condominium.name, 'Condomínio Teste')
  assert.equal(state.draft.towers[0].name, 'Torre Norte')
  assert.equal(state.step, 1)
  assert.equal(state.maxVisited, 3)
})

test('reducer adiciona e remove torres sem alterar as restantes', () => {
  let state = createInitialWizardState()
  state = wizardReducer(state, { type: 'UPDATE_TOWER', id: 'tower-1', field: 'name', value: 'Torre A' })
  state = wizardReducer(state, { type: 'ADD_TOWER' })
  state = wizardReducer(state, { type: 'UPDATE_TOWER', id: 'tower-2', field: 'name', value: 'Torre B' })
  assert.deepEqual(state.draft.towers.map((tower) => tower.name), ['Torre A', 'Torre B'])
  state = wizardReducer(state, { type: 'REMOVE_TOWER', id: 'tower-1' })
  assert.deepEqual(state.draft.towers.map((tower) => tower.name), ['Torre B'])
})

test('térreo com apartamentos: andar 0 além dos andares informados, com a mesma numeração', () => {
  const tower = validTower({ floorCount: '2', unitsPerFloor: '2', ground: GROUND_WITH_UNITS })
  assert.deepEqual(generateTowerUnits(tower).map((unit) => unit.number), ['001', '002', '101', '102', '201', '202'])
  assert.equal(getTowerUnitCount(tower), 6)
  assert.deepEqual(getTowerUnitPreview(tower), { total: 6, first: '001', last: '202' })
  assert.deepEqual(getTowerFloors(tower).map((floor) => floor.floor), [0, 1, 2])
  assert.deepEqual(generateTowerUnits({ ...tower, separator: '-' }).slice(0, 2).map((unit) => unit.number), ['0-01', '0-02'])
  // Térreo sem apartamentos (padrão) e sem térreo residencial não geram nada no andar 0
  for (const ground of [undefined, 'SEM_APARTAMENTOS', 'SEM_TERREO']) {
    assert.deepEqual(generateTowerUnits({ ...tower, ground }).map((unit) => unit.number), ['101', '102', '201', '202'])
  }
})

test('térreo vai no envio e conta no limite de unidades', () => {
  const draft = { condominium: { name: 'X', address: 'Rua', city: 'Recife', state: 'PE' }, residentialModel: 'VERTICAL', commonAreas: [], customAreas: [],
    towers: [validTower({ ground: GROUND_WITH_UNITS }), { ...validTower(), id: 'tower-b', name: 'Torre B', ground: undefined }] }
  assert.deepEqual(buildSetupPayload(draft).torres.map((torre) => torre.terreo), ['COM_APARTAMENTOS', 'SEM_APARTAMENTOS'])
  // 50 andares x 100 = 5.000 cabe; com o térreo vira 5.100
  assert.equal(validateTowers([validTower({ floorCount: '50', unitsPerFloor: '100', unitDigits: '3', separator: '-' })]).length, 0)
  assert.ok(validateTowers([validTower({ floorCount: '50', unitsPerFloor: '100', unitDigits: '3', separator: '-', ground: GROUND_WITH_UNITS })]).length > 0)
})
