import test from 'node:test'
import assert from 'node:assert/strict'
import { setToken } from '../src/services/api.js'
import { NO_RECIPIENT, carregarEncomendas, findPackageUnit, packageTimeLabel, pickupBody, registrarEncomenda, registrarRetiradaEncomenda, toPackage } from '../src/services/encomendasApi.js'
import { sameUnit } from '../src/services/serviceUtils.js'

// sessionStorage mínimo para o Node
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }
globalThis.window = new EventTarget()

function fakeFetch(routes) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    const route = routes.find(([prefix]) => url.includes(prefix))
    if (!route) return { ok: false, status: 404, json: async () => ({}), text: async () => '{}' }
    const [, status, body] = route
    return { ok: status < 400, status, json: async () => body, text: async () => (body === undefined ? '' : JSON.stringify(body)) }
  }
  return { fetchImpl, calls }
}

const dto = {
  id: 'e-1', codigoIdentificacao: 'BR123', observacao: 'Caixa média', status: 'AGUARDANDO RETIRADA',
  dataHoraRecebimento: '2026-10-27T14:32:05', dataHoraRetirada: null,
  apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', moradorNome: 'Carla Souza',
  porteiroRecebimentoNome: 'João', porteiroRetiradaNome: null,
}

test('encomenda da API vira encomenda da tela, com status no formato das abas', () => {
  const pkg = toPackage(dto, new Date('2026-10-27T18:00:00'))
  assert.deepEqual(pkg, {
    id: 'e-1', code: 'BR123', noRecipient: false, resident: 'Carla Souza', tower: 'Torre A', unit: '101', unitId: 'a-101',
    receivedAt: 'Hoje · 14:32', doorman: 'João', status: 'AGUARDANDO_RETIRADA', withdrawnAt: '', withdrawnBy: '', pickedUpBy: '', informedUnit: '', notes: 'Caixa média',
  })
  const retirada = toPackage({ ...dto, status: 'RETIRADA', dataHoraRetirada: '2026-10-28T09:05:00', porteiroRetiradaNome: 'Maria', torreNome: null, moradorNome: null }, new Date('2026-10-28T10:00:00'))
  assert.equal(retirada.status, 'RETIRADA')
  assert.equal(retirada.receivedAt, '27/10 · 14:32')
  assert.equal(retirada.withdrawnAt, 'Hoje · 09:05')
  assert.equal(retirada.withdrawnBy, 'Maria')
  assert.equal(retirada.tower, '')
  assert.equal(retirada.resident, '')
})

test('rótulo de horário ignora valor vazio ou inválido', () => {
  assert.equal(packageTimeLabel(null), '')
  assert.equal(packageTimeLabel('ontem'), '')
})

test('unidade da encomenda: torre + número, ou só número em condomínio sem torres', () => {
  const units = [{ id: 'a', tower: 'Torre A', number: '101' }, { id: 'b', tower: 'Torre B', number: '101' }, { id: 'c', tower: '', number: '12' }]
  assert.equal(findPackageUnit(units, { tower: 'Torre B', unit: '101' }).id, 'b')
  assert.equal(findPackageUnit(units, { unit: ' 12 ' }).id, 'c')
  assert.equal(findPackageUnit(units, { tower: 'Torre A', unit: '12' }), undefined)
})

test('carregarEncomendas usa o escopo do servidor e converte cada item', async () => {
  setToken('token')
  const { fetchImpl, calls } = fakeFetch([['/portaria/encomendas', 200, [dto]]])
  const packages = await carregarEncomendas({ fetchImpl })
  assert.equal(calls[0].url.endsWith('/portaria/encomendas'), true)
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token')
  assert.equal(packages[0].code, 'BR123')
})

test('registrar encomenda envia unidade, código e observação; retirada usa PUT', async () => {
  setToken('token')
  const units = [{ id: 'a-101', tower: 'Torre A', number: '101' }]
  const { fetchImpl, calls } = fakeFetch([['/recebimento', 200, dto], ['/retirada', 200, { ...dto, status: 'RETIRADA' }]])

  await registrarEncomenda({ tower: 'Torre A', unit: '101', code: ' BR123 ', notes: '  ' }, units, { fetchImpl })
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), { apartamentoId: 'a-101', codigoIdentificacao: 'BR123', observacao: null })

  await registrarRetiradaEncomenda('e-1', { retiranteNome: 'Carla' }, { fetchImpl })
  assert.equal(calls[1].init.method, 'PUT')
  assert.equal(calls[1].url.endsWith('/portaria/encomendas/e-1/retirada'), true)
  assert.deepEqual(JSON.parse(calls[1].init.body), { retiranteNome: 'Carla' })

  await assert.rejects(registrarEncomenda({ tower: 'Torre A', unit: '999', code: 'X' }, units, { fetchImpl }), (error) => error.status === 400 && /unidade existente/.test(error.message))
  await assert.rejects(registrarEncomenda({ tower: 'Torre A', unit: '101', code: ' ' }, units, { fetchImpl }), (error) => error.status === 400 && /código/.test(error.message))
  assert.equal(calls.length, 2)
})

test('mesma unidade: compara torre e número; sem torre, só o número', () => {
  assert.equal(sameUnit({ tower: 'Torre A', unit: '101' }, { tower: 'Torre A', unit: '101' }), true)
  assert.equal(sameUnit({ tower: 'Torre A', unit: '101' }, { tower: 'Torre B', unit: '101' }), false)
  assert.equal(sameUnit({ tower: '', unit: '12' }, { tower: '', unit: '12' }), true)
  assert.equal(sameUnit({ tower: 'Torre A', unit: '12' }, { tower: '', unit: '12' }), false)
  assert.equal(sameUnit({ tower: '', unit: '' }, { tower: '', unit: '' }), false)
})

test('encomenda sem destinatário: registro sem unidade, retirada com nome, código e apartamento informado', async () => {
  setToken('token')
  const units = [{ id: 'a-101', tower: 'Torre A', number: '101' }, { id: 'a-202', tower: 'Torre A', number: '202' }]
  const { fetchImpl, calls } = fakeFetch([['/recebimento', 200, dto]])
  await registrarEncomenda({ noRecipient: true, tower: 'Torre A', unit: '999', code: 'BR777', notes: 'Caixa marrom' }, units, { fetchImpl })
  assert.deepEqual(JSON.parse(calls[0].init.body), { apartamentoId: null, codigoIdentificacao: 'BR777', observacao: 'Caixa marrom' })

  // Na tela: sem destinatário e, depois da retirada, quem retirou e de qual apartamento disse ser
  const sem = toPackage({ ...dto, semDestinatario: true, apartamentoId: null, apartamentoNumero: null, torreNome: null, moradorNome: null,
    status: 'RETIRADA', retiranteNome: 'Maria', retiranteApartamentoNumero: '202', retiranteTorreNome: 'Torre A' })
  assert.equal(sem.noRecipient, true)
  assert.equal(sem.resident, NO_RECIPIENT)
  assert.equal(sem.pickedUpBy, 'Maria')
  assert.equal(sem.informedUnit, '202 · Torre A')

  // Corpo da retirada: com unidade, só o nome; sem destinatário, também código e apartamento informado
  assert.deepEqual(pickupBody({ noRecipient: false }, { name: ' Carla ' }, units), { retiranteNome: 'Carla', codigoConferencia: null, apartamentoInformadoId: null })
  assert.deepEqual(pickupBody({ noRecipient: true }, { name: 'Maria', code: ' BR777 ', tower: 'Torre A', unit: '202' }, units),
    { retiranteNome: 'Maria', codigoConferencia: 'BR777', apartamentoInformadoId: 'a-202' })
  assert.throws(() => pickupBody({ noRecipient: false }, { name: ' ' }, units), (error) => error.status === 400)
  assert.throws(() => pickupBody({ noRecipient: true }, { name: 'Maria', tower: 'Torre A', unit: '202' }, units), (error) => /código/.test(error.message))
  assert.throws(() => pickupBody({ noRecipient: true }, { name: 'Maria', code: 'BR777', tower: 'Torre A', unit: '999' }, units), (error) => /apartamento/.test(error.message))
})
