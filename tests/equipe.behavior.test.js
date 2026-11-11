import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { JSDOM } from 'jsdom'
import { createTestServer } from './viteTestServer.js'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Event = dom.window.Event
globalThis.sessionStorage = dom.window.sessionStorage
dom.window.HTMLElement.prototype.scrollIntoView = () => {}

process.env.VITE_API_URL = 'http://api.test'
const server = await createTestServer()
delete process.env.VITE_API_URL
const { cleanup, fireEvent, render, waitFor } = await import('@testing-library/react')
const { MemoryRouter } = await import('react-router-dom')
const { AppDataProvider } = await server.ssrLoadModule('/src/context/AppDataContext.jsx')
const { default: EntityPage } = await server.ssrLoadModule('/src/pages/desktop/EntityPage.jsx')

const jwt = (claims) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.assinatura`
}

const admin = { id: 'u-adm', nome: 'Admin', cpf: '529.982.247-25', perfil: 'ADMIN', status: 'ATIVO', configuracaoInicial: 'CONCLUIDA', condominioNome: 'Residencial', primeiroAcessoPendente: false }
const morador = { id: 'u-mor', nome: 'Carla Morador', cpf: '390.533.447-05', perfil: 'MORADOR', status: 'ATIVO', vinculo: 'PROPRIETARIO', apartamentoId: 'a-101', apartamentoNumero: '101', torreNome: 'Torre A' }

// API falsa do /usuarios: guarda o que foi cadastrado para a recarga mostrar o novo usuário
function fakeApi() {
  const calls = []
  let users = [admin, morador]
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname
    const method = init.method || 'GET'
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ method, path, body })
    const reply = (status, payload) => ({ ok: status < 400, status, json: async () => payload, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) })
    if (path === '/usuarios/me') return reply(200, admin)
    if (path === '/usuarios' && method === 'GET') return reply(200, users)
    if (path === '/usuarios' && method === 'POST') {
      if (users.some((user) => user.cpf === body.cpf)) return reply(409, { mensagem: 'Já existe um usuário cadastrado com este CPF.' })
      const created = { id: 'u-new', nome: body.nome, cpf: body.cpf, email: body.email || null, telefone: body.telefone || null, perfil: body.perfil, status: 'ATIVO', primeiroAcessoPendente: true }
      users = [...users, created]
      return reply(200, created)
    }
    const statusMatch = path.match(/^\/usuarios\/([^/]+)\/(ativar|desativar)$/)
    if (statusMatch && method === 'PUT') {
      const [, id, action] = statusMatch
      users = users.map((user) => user.id === id ? { ...user, status: action === 'ativar' ? 'ATIVO' : 'INATIVO' } : user)
      return reply(200, users.find((user) => user.id === id))
    }
    if (path === '/condominios/torres') return reply(200, [{ id: 't-a', nome: 'Torre A' }])
    if (path === '/condominios/apartamentos') return reply(200, [{ id: 'a-101', numero: '101', torreId: 't-a', status: 'OCUPADO' }])
    return reply(200, [])
  }
  return calls
}

function renderPage() {
  sessionStorage.setItem('condoplus.token', jwt({ perfil: 'ADMIN', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 }))
  return render(React.createElement(AppDataProvider, null, React.createElement(MemoryRouter, null, React.createElement(EntityPage, { role: 'admin', type: 'equipe' }))))
}

test.afterEach(() => { cleanup(); sessionStorage.clear() })
test.after(async () => { await server.close(); dom.window.close() })

test('tela de equipe: lista só portaria/administração e cadastra um porteiro pela API', async () => {
  const calls = fakeApi()
  const view = renderPage()

  assert.ok(await view.findByText('Admin'))
  assert.equal(view.queryByText('Carla Morador'), null)
  assert.ok(view.getByRole('link', { name: 'Equipe' }))

  fireEvent.click(view.getByRole('button', { name: /Cadastrar usuário/ }))
  // Perfil já vem como Portaria
  assert.equal(view.getByRole('combobox', { name: /^Perfil/ }).value, 'PORTARIA')
  fireEvent.change(view.getByLabelText(/^Nome/), { target: { value: 'José Porteiro' } })
  fireEvent.change(view.getByLabelText(/^CPF/), { target: { value: '111.444.777-35' } })
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }))

  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/usuarios')))
  assert.deepEqual(calls.find((call) => call.method === 'POST').body, { nome: 'José Porteiro', cpf: '111.444.777-35', email: '', telefone: '', perfil: 'PORTARIA', apartamentoId: null, vinculo: null })
  assert.ok(await view.findByText('José Porteiro'))
  assert.ok(view.getByText('Primeiro acesso pendente'))
  assert.ok(view.getByText(/já pode fazer o primeiro acesso/))
})

test('tela de equipe: CPF repetido mantém o formulário aberto com a mensagem do servidor', async () => {
  fakeApi()
  const view = renderPage()
  await view.findByText('Admin')

  fireEvent.click(view.getByRole('button', { name: /Cadastrar usuário/ }))
  fireEvent.change(view.getByLabelText(/^Nome/), { target: { value: 'Outro' } })
  fireEvent.change(view.getByLabelText(/^CPF/), { target: { value: admin.cpf } })
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }))

  assert.ok(await view.findByText('Já existe um usuário cadastrado com este CPF.'))
  assert.ok(view.getByLabelText(/^Nome/))
})

test('tela de equipe: desativar um usuário chama a API e atualiza o status', async () => {
  const calls = fakeApi()
  const view = renderPage()
  await view.findByText('Admin')

  fireEvent.click(view.getByRole('button', { name: 'Ver detalhes' }))
  fireEvent.click(view.getByRole('button', { name: 'Desativar' }))
  fireEvent.click(view.getAllByRole('button', { name: 'Desativar usuário' }).at(-1))

  await waitFor(() => assert.ok(calls.some((call) => call.method === 'PUT' && call.path === '/usuarios/u-adm/desativar')))
  assert.ok(await view.findByText(/não consegue mais entrar/))
})

test('tela de equipe: síndico que mora no condomínio leva unidade e vínculo', async () => {
  const calls = fakeApi()
  const view = renderPage()
  assert.ok(await view.findByText('Admin'))

  fireEvent.click(view.getByRole('button', { name: /Cadastrar usuário/ }))
  // Porteiro não tem a opção de morar no condomínio
  assert.equal(view.queryByLabelText(/Mora no condomínio/), null)
  fireEvent.change(view.getByRole('combobox', { name: /^Perfil/ }), { target: { value: 'ADMIN' } })
  fireEvent.change(view.getByLabelText(/^Nome/), { target: { value: 'Síndico Morador' } })
  fireEvent.change(view.getByLabelText(/^CPF/), { target: { value: '111.444.777-35' } })
  fireEvent.click(view.getByLabelText(/Mora no condomínio/))
  fireEvent.change(view.getByLabelText(/Torre \/ Bloco onde mora/), { target: { value: 'Torre A' } })
  fireEvent.change(view.getByLabelText(/Apartamento onde mora/), { target: { value: '101' } })
  fireEvent.change(view.getByLabelText(/Vínculo com a unidade/), { target: { value: 'INQUILINO' } })
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }))

  await waitFor(() => assert.ok(calls.some((call) => call.method === 'POST' && call.path === '/usuarios')))
  const body = calls.find((call) => call.method === 'POST' && call.path === '/usuarios').body
  assert.deepEqual([body.perfil, body.apartamentoId, body.vinculo], ['ADMIN', 'a-101', 'INQUILINO'])
})
