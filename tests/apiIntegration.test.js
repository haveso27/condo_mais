import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, apiGet, condominioIdFromToken, getToken, setToken, tokenClaims } from '../src/services/api.js'
import { subscribeToSessionChanges } from '../src/services/sessionEvents.js'
import { createTestServer } from './viteTestServer.js'
import { alterarStatusMorador, carregarCadastros, carregarUsuarioLogado, criarTorre, excluirTorre, excluirUnidade, linkResidents, salvarMorador, salvarUnidade, salvarUsuarioEquipe, staffRole, toResident, toStaff, toUnit } from '../src/services/cadastrosApi.js'

// sessionStorage mínimo para o Node; cada teste define o próprio token.
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }
globalThis.window = new EventTarget()

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const fakeJwt = (claims) => `${base64url({ alg: 'HS256' })}.${base64url(claims)}.assinatura`

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

test('lê claims do token, inclusive com acentos, e rejeita token malformado', () => {
  const token = fakeJwt({ sub: '12345678900', perfil: 'Administração', condominio_id: 'c-1' })
  assert.equal(tokenClaims(token).perfil, 'Administração')
  assert.equal(condominioIdFromToken(token), 'c-1')
  assert.equal(tokenClaims('nao-eh-jwt'), null)
  assert.equal(condominioIdFromToken(''), '')
})

test('apiGet envia bearer token e ignora parâmetros vazios', async () => {
  setToken('token-teste')
  const { fetchImpl, calls } = fakeFetch([['/condominios/torres', 200, []]])
  await apiGet('/condominios/torres', { condominioId: 'c-1', torreId: '', outro: null }, { fetchImpl })
  assert.match(calls[0].url, /\/condominios\/torres\?condominioId=c-1$/)
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-teste')
})

test('apiGet converte falhas HTTP e de rede em ApiError com mensagem amigável', async () => {
  setToken('token-teste')
  const unauthorized = fakeFetch([['/x', 401, {}]])
  await assert.rejects(apiGet('/x', {}, unauthorized), (error) => error instanceof ApiError && error.status === 401 && /Sessão inválida/.test(error.message))
  const forbidden = fakeFetch([['/x', 403, {}]])
  await assert.rejects(apiGet('/x', {}, forbidden), (error) => error.status === 403 && /não tem permissão/.test(error.message))
  const offline = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(apiGet('/x', {}, { fetchImpl: offline }), (error) => error.status === 0 && /conectar ao servidor/.test(error.message))
})

test('401 invalida somente o token que originou a requisição e notifica a sessão', async () => {
  setToken('token-expirado')
  let notifications = 0
  const unsubscribe = subscribeToSessionChanges(() => { notifications += 1 })
  try {
    await assert.rejects(apiGet('/plataforma/condominios', {}, fakeFetch([['/plataforma/condominios', 401, {}]])), (error) => error.status === 401)
    assert.equal(getToken(), '')
    assert.equal(notifications, 1)
  } finally { unsubscribe() }
})

test('401 atrasado de token antigo não encerra sessão nova e 403 não invalida token', async () => {
  setToken('token-antigo')
  let release
  const delayedFetch = () => new Promise((resolve) => { release = resolve })
  const oldRequest = apiGet('/plataforma/condominios', {}, { fetchImpl: delayedFetch })
  setToken('token-novo')
  release({ ok: false, status: 401, json: async () => ({}), text: async () => '{}' })
  await assert.rejects(oldRequest, (error) => error.status === 401)
  assert.equal(getToken(), 'token-novo')

  await assert.rejects(apiGet('/plataforma/condominios', {}, fakeFetch([['/plataforma/condominios', 403, {}]])), (error) => error.status === 403)
  assert.equal(getToken(), 'token-novo')
})

test('erros de negócio exibem a mensagem da API; sessão e falha interna usam texto fixo', async () => {
  setToken('token-teste')
  const erro = (status, mensagem) => ({ status, erro: 'x', mensagem, caminho: '/x', timestamp: '2026-09-29T00:00:00Z' })
  for (const [status, mensagem] of [[400, 'A prioridade deve ser NORMAL ou URGENTE.'], [404, 'Torre não encontrada.'], [409, 'Não é possível excluir a torre: existem apartamentos vinculados.'], [403, 'Acesso negado a dados de outro condomínio.']]) {
    await assert.rejects(apiGet('/x', {}, fakeFetch([['/x', status, erro(status, mensagem)]])), (error) => error.status === status && error.message === mensagem)
  }
  await assert.rejects(apiGet('/x', {}, fakeFetch([['/x', 401, erro(401, 'Token ausente, inválido ou expirado.')]])), (error) => /Sessão inválida/.test(error.message))
  await assert.rejects(apiGet('/x', {}, fakeFetch([['/x', 500, erro(500, 'detalhe interno')]])), (error) => /servidor não conseguiu/.test(error.message) && !/detalhe interno/.test(error.message))
})

test('erro sem corpo JSON ou sem mensagem usa o texto padrão do status', async () => {
  setToken('token-teste')
  const semJson = async () => ({ ok: false, status: 404, json: async () => { throw new SyntaxError('Unexpected end of JSON input') } })
  await assert.rejects(apiGet('/x', {}, { fetchImpl: semJson }), (error) => error.status === 404 && error.message === 'Registro não encontrado.')
  await assert.rejects(apiGet('/x', {}, fakeFetch([['/x', 409, { mensagem: '   ' }]])), (error) => error.message === 'Não foi possível concluir a operação.')
})

test('apartamento vira unidade com nome da torre; sem torre fica em branco', () => {
  const towers = { 't-a': 'Torre A' }
  assert.deepEqual(toUnit({ id: 'ap-1', numero: '203', status: 'ocupado', torreId: 't-a', condominioId: 'c-1' }, towers), { id: 'ap-1', number: '203', tower: 'Torre A', towerId: 't-a', status: 'OCUPADO', owners: [], residents: [] })
  assert.equal(toUnit({ id: 'ap-2', numero: '10', status: null, torreId: null }, towers).tower, '')
  assert.equal(toUnit({ id: 'ap-2', numero: '10', status: null, torreId: null }, towers).status, '')
})

const usuarioMorador = { id: 'u-1', nome: 'Maria', cpf: '529.982.247-25', email: 'm@x.com', telefone: '11900000000', perfil: 'MORADOR', status: 'ATIVO', vinculo: 'PROPRIETARIO', apartamentoId: 'ap-1', apartamentoNumero: '203', torreNome: 'Torre A', primeiroAcessoPendente: true }

test('usuário morador vira morador da tela e preenche os vínculos da unidade', () => {
  const resident = toResident(usuarioMorador)
  assert.deepEqual(resident, { id: 'u-1', name: 'Maria', cpf: '529.982.247-25', email: 'm@x.com', phone: '11900000000', tower: 'Torre A', unit: '203', unitId: 'ap-1', relation: 'PROPRIETARIO', isOwner: true, status: 'ATIVO', pendingFirstAccess: true })
  const inquilino = toResident({ ...usuarioMorador, id: 'u-2', nome: 'João', vinculo: 'INQUILINO' })
  const inativo = toResident({ ...usuarioMorador, id: 'u-3', nome: 'Ex', status: 'INATIVO' })
  const [unit] = linkResidents([toUnit({ id: 'ap-1', numero: '203', torreId: 't-a' }, { 't-a': 'Torre A' })], [resident, inquilino, inativo])
  assert.deepEqual(unit.owners, ['Maria'])
  assert.deepEqual(unit.residents, ['Maria', 'João'])
})

test('carregarCadastros junta torres, unidades e moradores do condomínio do token', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const { fetchImpl, calls } = fakeFetch([
    ['/condominios/torres', 200, [{ id: 't-b', nome: 'Torre B' }, { id: 't-a', nome: 'Torre A' }]],
    ['/condominios/apartamentos', 200, [{ id: 'ap-1', numero: '203', status: 'OCUPADO', torreId: 't-a' }]],
    ['/usuarios', 200, [usuarioMorador, { ...usuarioMorador, id: 'adm', perfil: 'ADMIN', apartamentoId: null }]],
  ])
  const { towers, units, residents } = await carregarCadastros({ fetchImpl })
  assert.deepEqual(towers.map((tower) => tower.name), ['Torre A', 'Torre B'])
  assert.deepEqual(units.map((unit) => [unit.number, unit.tower, unit.owners]), [['203', 'Torre A', ['Maria']]])
  assert.deepEqual(residents.map((resident) => resident.id), ['u-1'])
  assert.ok(calls.filter((call) => call.url.includes('/condominios/')).every((call) => call.url.includes('condominioId=c-1')))
})

test('carregarCadastros sem permissão de listar usuários traz moradores vazios', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const { fetchImpl } = fakeFetch([['/condominios/torres', 200, []], ['/condominios/apartamentos', 200, []], ['/usuarios', 403, { mensagem: 'Apenas administradores podem gerenciar usuários.' }]])
  assert.deepEqual((await carregarCadastros({ fetchImpl })).residents, [])
})

test('carregarCadastros sem condomínio no token não consulta a API', async () => {
  setToken('')
  const { fetchImpl, calls } = fakeFetch([])
  await assert.rejects(carregarCadastros({ fetchImpl }), (error) => error.status === 401)
  assert.equal(calls.length, 0)
})

test('comandos de unidade e torre montam a requisição certa', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const towers = [{ id: 't-a', name: 'Torre A' }]
  const { fetchImpl, calls } = fakeFetch([['/condominios', 200, {}]])
  await criarTorre(' Torre C ', { fetchImpl })
  await salvarUnidade({ tower: 'Torre A', number: ' 301 ', status: 'LIVRE' }, undefined, towers, { fetchImpl })
  await salvarUnidade({ tower: 'Torre A', number: '301', status: 'OCUPADO' }, 'ap-9', towers, { fetchImpl })
  await excluirUnidade('ap-9', { fetchImpl })
  assert.deepEqual(calls.map((call) => [call.init.method, call.url.replace(/^.*(\/condominios)/, '$1')]), [['POST', '/condominios/torres'], ['POST', '/condominios/apartamentos'], ['PUT', '/condominios/apartamentos/ap-9'], ['DELETE', '/condominios/apartamentos/ap-9']])
  assert.deepEqual(JSON.parse(calls[0].init.body), { nome: 'Torre C', condominioId: 'c-1' })
  assert.deepEqual(JSON.parse(calls[1].init.body), { numero: '301', status: 'LIVRE', torreId: 't-a', condominioId: 'c-1' })
  await assert.rejects(salvarUnidade({ tower: 'Torre Z', number: '1', status: 'LIVRE' }, undefined, towers, { fetchImpl }), (error) => error.status === 400)
  await assert.rejects(criarTorre('  ', { fetchImpl }), (error) => error.status === 400)
})

test('comandos de morador resolvem a unidade e usam /usuarios', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const units = [{ id: 'ap-1', tower: 'Torre A', number: '203' }]
  const { fetchImpl, calls } = fakeFetch([['/usuarios', 200, usuarioMorador]])
  const form = { name: 'Maria', cpf: '52998224725', email: 'm@x.com', phone: '11900000000', tower: 'Torre A', unit: ' 203 ', relation: 'PROPRIETARIO' }
  await salvarMorador(form, undefined, units, { fetchImpl })
  await salvarMorador(form, 'u-1', units, { fetchImpl })
  await alterarStatusMorador('u-1', 'INATIVO', { fetchImpl })
  await alterarStatusMorador('u-1', 'ATIVO', { fetchImpl })
  assert.deepEqual(calls.map((call) => [call.init.method, call.url.replace(/^.*(\/usuarios)/, '$1')]), [['POST', '/usuarios'], ['PUT', '/usuarios/u-1'], ['PUT', '/usuarios/u-1/desativar'], ['PUT', '/usuarios/u-1/ativar']])
  assert.deepEqual(JSON.parse(calls[0].init.body), { nome: 'Maria', cpf: '52998224725', email: 'm@x.com', telefone: '11900000000', perfil: 'MORADOR', apartamentoId: 'ap-1', vinculo: 'PROPRIETARIO' })
  await assert.rejects(salvarMorador({ ...form, unit: '999' }, undefined, units, { fetchImpl }), (error) => error.status === 400 && /unidade existente/.test(error.message))
})

test('usuários de portaria e administração viram a equipe; perfis legados contam igual', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const porteiro = { id: 'p-1', nome: 'José', cpf: '111.444.777-35', email: null, telefone: null, perfil: 'PORTARIA', status: 'ATIVO', primeiroAcessoPendente: true }
  const { fetchImpl } = fakeFetch([
    ['/condominios/torres', 200, []],
    ['/condominios/apartamentos', 200, []],
    ['/usuarios', 200, [usuarioMorador, porteiro, { ...porteiro, id: 'p-2', perfil: 'Porteiro' }, { ...porteiro, id: 'adm', perfil: 'Administrador', status: 'INATIVO', primeiroAcessoPendente: false }]],
  ])
  const { residents, staff } = await carregarCadastros({ fetchImpl })
  assert.deepEqual(residents.map((resident) => resident.id), ['u-1'])
  assert.deepEqual(staff.map((member) => [member.id, member.role, member.status]), [['p-1', 'PORTARIA', 'ATIVO'], ['p-2', 'PORTARIA', 'ATIVO'], ['adm', 'ADMIN', 'INATIVO']])
  assert.deepEqual(toStaff(porteiro), { id: 'p-1', name: 'José', cpf: '111.444.777-35', email: '', phone: '', role: 'PORTARIA', status: 'ATIVO', pendingFirstAccess: true, livesHere: false, tower: '', unit: '', relation: '' })
  assert.equal(staffRole('MORADOR'), '')
})

test('cadastro da equipe: portaria sem unidade; síndico com unidade e vínculo quando mora no condomínio', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const { fetchImpl, calls } = fakeFetch([['/usuarios', 200, {}]])
  const form = { name: ' José ', cpf: '111.444.777-35', role: 'PORTARIA', email: '', phone: ' 81999990000 ' }
  await salvarUsuarioEquipe(form, undefined, [], { fetchImpl })
  await salvarUsuarioEquipe({ ...form, role: 'ADMIN' }, 'p-1', [], { fetchImpl })
  assert.deepEqual(calls.map((call) => [call.init.method, call.url.replace(/^.*(\/usuarios)/, '$1')]), [['POST', '/usuarios'], ['PUT', '/usuarios/p-1']])
  assert.deepEqual(JSON.parse(calls[0].init.body), { nome: 'José', cpf: '111.444.777-35', email: '', telefone: '81999990000', perfil: 'PORTARIA', apartamentoId: null, vinculo: null })
  assert.equal(JSON.parse(calls[1].init.body).perfil, 'ADMIN')
  assert.equal(JSON.parse(calls[1].init.body).apartamentoId, null)
  await assert.rejects(salvarUsuarioEquipe({ ...form, role: 'MORADOR' }, undefined, [], { fetchImpl }), (error) => error.status === 400 && /perfil/.test(error.message))
  assert.equal(calls.length, 2)

  // Síndico que mora no condomínio: unidade (torre + número) e vínculo; sem eles, não envia
  const units = [{ id: 'a-101', tower: 'Torre A', number: '101' }]
  await salvarUsuarioEquipe({ ...form, role: 'ADMIN', livesHere: true, tower: 'Torre A', unit: '101', relation: 'PROPRIETARIO' }, undefined, units, { fetchImpl })
  assert.deepEqual([JSON.parse(calls[2].init.body).apartamentoId, JSON.parse(calls[2].init.body).vinculo], ['a-101', 'PROPRIETARIO'])
  await assert.rejects(salvarUsuarioEquipe({ ...form, role: 'ADMIN', livesHere: true, tower: 'Torre A', unit: '999', relation: 'PROPRIETARIO' }, undefined, units, { fetchImpl }), (error) => /unidade/.test(error.message))
  await assert.rejects(salvarUsuarioEquipe({ ...form, role: 'ADMIN', livesHere: true, tower: 'Torre A', unit: '101' }, undefined, units, { fetchImpl }), (error) => /vínculo/.test(error.message))
  // Porteiro nunca leva unidade, mesmo se o formulário tiver
  await salvarUsuarioEquipe({ ...form, livesHere: true, tower: 'Torre A', unit: '101', relation: 'PROPRIETARIO' }, undefined, units, { fetchImpl })
  assert.equal(JSON.parse(calls[3].init.body).apartamentoId, null)
})

test('resposta 200 sem corpo (ex.: DELETE) não quebra', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => '', json: async () => { throw new SyntaxError('empty') } })
  assert.equal(await excluirUnidade('ap-1', { fetchImpl }), null)
})

test('usuário logado vem de /usuarios/me com unidade, condomínio e estado de configuração', async () => {
  setToken(fakeJwt({ condominio_id: 'c-1' }))
  const { fetchImpl, calls } = fakeFetch([['/usuarios/me', 200, { ...usuarioMorador, vinculo: 'INQUILINO', condominioNome: 'Residencial Real', configuracaoInicial: 'CONCLUIDA', modeloCondominio: 'VERTICAL' }]])
  const { currentResident, condominiumName, profile, setupState, condominiumModel } = await carregarUsuarioLogado({ fetchImpl })
  assert.match(calls[0].url, /\/usuarios\/me$/)
  assert.equal(currentResident.name, 'Maria')
  assert.equal(currentResident.unit, '203')
  assert.equal(currentResident.tower, 'Torre A')
  assert.equal(currentResident.isOwner, false)
  assert.equal(condominiumName, 'Residencial Real')
  assert.equal(profile, 'MORADOR')
  assert.equal(setupState, 'CONCLUIDA')
  assert.equal(condominiumModel, 'VERTICAL')
})

test('com a API ligada, o estado inicial não traz dados de demonstração', async () => {
  const server = await createTestServer()
  try {
    const { apiInitialData } = await server.ssrLoadModule('/src/context/AppDataContext.jsx')
    const { initialAppData } = await server.ssrLoadModule('/src/mocks/appData.js')
    for (const key of ['towers', 'units', 'residents', 'staff', 'visitors', 'providers', 'packages', 'reservations', 'notices', 'tickets', 'history', 'notifications']) {
      assert.deepEqual(apiInitialData[key], [], key)
    }
    assert.equal(apiInitialData.currentResident.name, '')
    assert.equal(apiInitialData.condominium.name, '')
    const serialized = JSON.stringify(apiInitialData)
    for (const person of [...initialAppData.residents, ...initialAppData.staff]) assert.ok(!serialized.includes(person.name), person.name)
    assert.ok(!serialized.includes(initialAppData.condominium.name))
  } finally { await server.close() }
})

test('excluir torre: DELETE da torre e aviso de quantas unidades saem junto', async () => {
  const { towerDeletionMessage } = await import('../src/services/cadastrosApi.js')
  const { fetchImpl, calls } = fakeFetch([['/condominios', 204, null]])
  await excluirTorre('t-a', { fetchImpl })
  assert.deepEqual(calls.map((call) => [call.init.method, call.url.replace(/^.*(\/condominios)/, '$1')]), [['DELETE', '/condominios/torres/t-a']])

  const units = [{ tower: 'Torre A', number: '101' }, { tower: 'Torre A', number: '102' }, { tower: 'Torre B', number: '101' }]
  assert.match(towerDeletionMessage('Torre A', units), /"Torre A".*As 2 unidades dela também serão excluídas/)
  assert.match(towerDeletionMessage('Torre B', units), /A unidade dela também será excluída/)
  assert.match(towerDeletionMessage('Torre C', units), /não tem unidades/)
  assert.match(towerDeletionMessage('Torre A', units), /morador, encomenda, visita ou chamado/)
  assert.equal(towerDeletionMessage('', units), 'Selecione a torre que será excluída.')
})
