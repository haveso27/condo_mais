import test from 'node:test'
import assert from 'node:assert/strict'
import { setToken } from '../src/services/api.js'
import { TICKET_COMMON_AREA, atualizarChamado, carregarChamados, comentarChamado, ticketBody, ticketNextStatuses, ticketUnitLabel, toTicket } from '../src/services/chamadosApi.js'

const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }
globalThis.window = new EventTarget()

function fakeFetch() {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200, json: async () => ({}), text: async () => '{}' }
  }
  return { fetchImpl, calls }
}

const base = {
  id: '3f2a1c9e-1111-4222-8333-444455556666', titulo: 'Lâmpada', descricao: 'Corredor', prioridade: 'BAIXA', status: 'EM ATENDIMENTO',
  categoriaId: 'cat-1', categoriaNome: 'Elétrica', apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A', solicitanteNome: 'Carla',
  responsavelExterno: 'Eletro Ltda', contatoExterno: '81 9999', dataPrevisaoAtendimento: '2026-10-30', dataAbertura: '2026-10-27T09:00:00', dataEncerramento: null,
  historico: [{ acao: 'ABERTURA', comentario: 'Chamado aberto no sistema.', dataHora: '2026-10-27T09:00:00', usuarioNome: 'Carla' }],
}

test('chamado da API vira chamado das telas, com protocolo curto e histórico do detalhe', () => {
  const ticket = toTicket(base)
  assert.equal(ticket.code, '#3F2A1C9E')
  assert.equal(ticket.status, 'EM_ATENDIMENTO')
  assert.equal(ticket.location, 'Unidade 101 · Torre A')
  assert.equal(ticket.category, 'Elétrica')
  assert.equal(ticket.provider, 'Eletro Ltda')
  assert.equal(ticket.forecast, '2026-10-30')
  assert.deepEqual(ticket.history.map((item) => [item.action, item.comment, item.author]), [['ABERTURA', 'Chamado aberto no sistema.', 'Carla']])
  // Na listagem o histórico vem nulo: o campo nem aparece
  const listed = toTicket({ ...base, historico: null, apartamentoId: null, apartamentoNumero: null, torreNome: null })
  assert.equal(Object.hasOwn(listed, 'history'), false)
  assert.equal(listed.location, 'Área comum')
})

test('formulário vira AberturaChamadoDTO: sem categoria = Outros (no backend), área comum = sem unidade', () => {
  const units = [{ id: 'a-101', number: '101', tower: 'Torre A' }, { id: 'a-12', number: '12', tower: '' }]
  const categories = [{ id: 'cat-1', name: 'Elétrica' }]
  assert.equal(ticketUnitLabel(units[0]), '101 · Torre A')
  assert.equal(ticketUnitLabel(units[1]), '12')
  assert.deepEqual(ticketBody({ title: ' Lâmpada ', description: ' Corredor ', category: 'Elétrica', location: '101 · Torre A', priority: 'BAIXA' }, { units, categories }),
    { titulo: 'Lâmpada', descricao: 'Corredor', categoriaId: 'cat-1', apartamentoId: 'a-101', prioridade: 'BAIXA', imagemUrl: null })
  assert.deepEqual(ticketBody({ title: 'X', description: 'Y', location: TICKET_COMMON_AREA }, { units, categories }),
    { titulo: 'X', descricao: 'Y', categoriaId: null, apartamentoId: null, prioridade: 'NORMAL', imagemUrl: null })
  assert.throws(() => ticketBody({ title: 'X', description: 'Y', category: 'Inexistente' }, { units, categories }), (error) => error.status === 400)
  assert.throws(() => ticketBody({ title: 'X', description: 'Y', location: '999' }, { units, categories }), (error) => error.status === 400)
  assert.throws(() => ticketBody({ title: ' ', description: 'Y' }, { units, categories }), (error) => error.status === 400)
})

test('andamento e comentário usam PUT e POST /comentarios', async () => {
  setToken('token')
  const { fetchImpl, calls } = fakeFetch()
  await atualizarChamado('c-1', { status: 'EM_ANALISE' }, { fetchImpl })
  assert.equal(calls[0].init.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[0].init.body), { status: 'EM_ANALISE', categoriaId: null, comentario: null })
  await atualizarChamado('c-1', { categoryId: 'cat-1' }, { fetchImpl })
  assert.deepEqual(JSON.parse(calls[1].init.body), { status: null, categoriaId: 'cat-1', comentario: null })
  await comentarChamado('c-1', ' Técnico chamado ', { fetchImpl })
  assert.equal(calls[2].url.endsWith('/atendimento/chamados/c-1/comentarios'), true)
  assert.deepEqual(JSON.parse(calls[2].init.body), { comentario: 'Técnico chamado' })
  assert.throws(() => comentarChamado('c-1', ' ', { fetchImpl }), (error) => error.status === 400)
})

test('portaria sem acesso às ocorrências: o 403 vira lista vazia, os demais erros continuam', async () => {
  setToken('token')
  const reply = (status) => async () => ({ ok: status < 400, status, json: async () => ({ mensagem: 'erro' }), text: async () => JSON.stringify({ mensagem: 'erro' }) })
  assert.deepEqual(await carregarChamados({ fetchImpl: reply(403) }), [])
  await assert.rejects(carregarChamados({ fetchImpl: reply(500) }), (error) => error.status === 500)
})

test('chamado resolvido não é reaberto: só pode ser encerrado', () => {
  assert.deepEqual(ticketNextStatuses('RESOLVIDO'), ['ENCERRADO'])
  assert.deepEqual(ticketNextStatuses('ABERTO'), ['EM_ANALISE', 'EM_ATENDIMENTO', 'RESOLVIDO', 'ENCERRADO'])
  assert.deepEqual(ticketNextStatuses('EM_ANALISE'), ['EM_ATENDIMENTO', 'RESOLVIDO', 'ENCERRADO'])
})
