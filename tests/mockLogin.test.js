import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { mockUsers, validateMockLogin } from '../src/mocks/mockUsers.js'

for (const [profile, path] of [['ADMINISTRADOR', '/admin'], ['PORTEIRO', '/portaria'], ['MORADOR', '/morador']]) {
  test(`login válido de ${profile} direciona para ${path}`, () => {
    const account = mockUsers.find((user) => user.profile === profile)
    assert.deepEqual(validateMockLogin(account.email, account.password), { path })
  })
}

test('senha incorreta não fornece destino nem permite entrada', () => {
  for (const account of mockUsers) {
    for (const password of ['incorreta', account.password.toLowerCase(), ` ${account.password}`]) {
      const result = validateMockLogin(account.email, password)
      assert.equal(result.path, undefined)
      assert.equal(result.error, 'E-mail ou senha inválidos.')
      assert.deepEqual(result.invalidFields, ['email', 'password'])
    }
  }
})

test('usuário inexistente e identificação antiga não fornecem destino', () => {
  for (const email of ['inexistente@condomais.local', '111.111.111-11', 'admin', 'sem-email']) {
    const result = validateMockLogin(email, mockUsers[0].password)
    assert.equal(result.path, undefined)
    assert.equal(result.error, 'E-mail ou senha inválidos.')
  }
})

test('campos vazios indicam os controles obrigatórios sem permitir entrada', () => {
  for (const [email, password, invalidFields] of [
    ['', '', ['email', 'password']],
    [' ', mockUsers[0].password, ['email']],
    [mockUsers[0].email, ' ', ['password']],
  ]) {
    const result = validateMockLogin(email, password)
    assert.equal(result.path, undefined)
    assert.equal(result.error, 'Preencha o e-mail e a senha.')
    assert.deepEqual(result.invalidFields, invalidFields)
  }
})

test('e-mail aceita maiúsculas e espaços externos, sem alterar a senha', () => {
  const account = mockUsers[0]
  assert.equal(validateMockLogin(` ${account.email.toUpperCase()} `, account.password).path, '/admin')
})

test('login renderizado oculta senha e não exibe seletor nem contas de desenvolvimento', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' })
  try {
    const { default: LoginPage } = await server.ssrLoadModule('/src/pages/auth/LoginPage.jsx')
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(LoginPage)))
    assert.match(html, /type="email"/)
    assert.match(html, /type="password"/)
    assert.match(html, /aria-required="true"/)
    assert.match(html, /Digite sua senha/)
    for (const account of mockUsers) {
      assert.ok(!html.includes(account.email))
      assert.ok(!html.includes(account.password))
    }
    assert.doesNotMatch(html, /demo-access|Escolha um perfil|Acessos de demonstração/)
    assert.doesNotMatch(html, />(?:Admin|Portaria|Morador)<\/button>/)
  } finally { await server.close() }
})
