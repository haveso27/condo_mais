import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, setToken } from '../src/services/api.js'
import { perguntarAoAssistente, toMensagens } from '../src/services/assistenteApi.js'

// sessionStorage mínimo para o Node
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }

function fakeFetch(status, body) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }
  }
  return { fetchImpl, calls }
}

test('converte o histórico do chat para o contrato da API', () => {
  assert.deepEqual(toMensagens([{ role: 'assistant', text: 'Olá' }, { role: 'user', text: 'Tem encomenda?' }]), [
    { papel: 'ASSISTENTE', texto: 'Olá' },
    { papel: 'USUARIO', texto: 'Tem encomenda?' },
  ])
})

test('envia a conversa com o token e devolve a resposta do assistente', async () => {
  setToken('token-morador')
  const { fetchImpl, calls } = fakeFetch(200, { resposta: 'Sim, há 1 encomenda aguardando retirada.' })
  const resposta = await perguntarAoAssistente([{ role: 'user', text: 'Tem alguma encomenda para mim?' }], { fetchImpl })
  assert.equal(resposta, 'Sim, há 1 encomenda aguardando retirada.')
  assert.match(calls[0].url, /\/assistente\/mensagens$/)
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer token-morador')
  assert.deepEqual(JSON.parse(calls[0].init.body), { mensagens: [{ papel: 'USUARIO', texto: 'Tem alguma encomenda para mim?' }] })
})

test('assistente desligado ou fora do ar vira mensagem de indisponibilidade', async () => {
  setToken('token-morador')
  await assert.rejects(perguntarAoAssistente([{ role: 'user', text: 'Oi' }], fakeFetch(503, {})), (error) => error instanceof ApiError && error.status === 503 && /indisponível/.test(error.message))
})

test('erros de negócio do servidor chegam com a mensagem original', async () => {
  setToken('token-morador')
  const forbidden = fakeFetch(403, { mensagem: 'O assistente virtual está disponível apenas para moradores.' })
  await assert.rejects(perguntarAoAssistente([{ role: 'user', text: 'Oi' }], forbidden), (error) => error.status === 403 && /apenas para moradores/.test(error.message))
})
