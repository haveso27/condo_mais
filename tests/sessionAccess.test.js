import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError } from '../src/services/api.js'
import {
  SESSION_ACCESS,
  SESSION_AREA,
  canLoadOperationalData,
  decideSessionAccess,
  loadSessionBeforeOperational,
  isConfirmedSession,
  normalizeProfile,
  resolveSessionAccess,
  sessionHome,
} from '../src/features/session/sessionAccess.js'

const jwt = (claims) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode(claims)}.`
}

const tokenFor = (perfil, condominium = true) => jwt({ perfil, ...(condominium ? { condominio_id: 'condo-1' } : {}) })
const decide = (perfil, area, configuracaoInicial) => decideSessionAccess({ token: tokenFor(perfil, perfil !== 'MASTER'), user: { perfil, configuracaoInicial }, area })

test('normaliza os perfis antigos sem confundir MASTER', () => {
  assert.equal(normalizeProfile(' Administração '), 'ADMIN')
  assert.equal(normalizeProfile('Porteiro'), 'PORTARIA')
  assert.equal(normalizeProfile('MASTER'), 'MASTER')
})

test('carregamento operacional depende da sessão confirmada, não das claims do JWT', () => {
  assert.equal(canLoadOperationalData({ profile: 'MASTER', setupState: null }), false)
  assert.equal(canLoadOperationalData({ profile: 'ADMIN', setupState: 'PENDENTE' }), false)
  assert.equal(canLoadOperationalData({ profile: 'ADMIN', setupState: 'CONCLUIDA' }), true)
  assert.equal(canLoadOperationalData({ profile: 'ADMIN', setupState: 'PROCESSANDO' }), false)
  assert.equal(canLoadOperationalData({ profile: 'PORTARIA' }), true)
  assert.equal(canLoadOperationalData({ profile: 'MORADOR' }), true)
})

test('sessão só é confirmada para perfis e estados conhecidos', () => {
  assert.equal(isConfirmedSession({ profile: 'MASTER' }), true)
  assert.equal(isConfirmedSession({ profile: 'ADMIN', setupState: 'PENDENTE' }), true)
  assert.equal(isConfirmedSession({ profile: 'ADMIN', setupState: 'CONCLUIDA' }), true)
  assert.equal(isConfirmedSession({ profile: 'ADMIN', setupState: '' }), false)
  assert.equal(isConfirmedSession({ profile: 'ADMIN', setupState: 'PROCESSANDO' }), false)
  assert.equal(isConfirmedSession({ profile: 'DESCONHECIDO' }), false)
  assert.equal(isConfirmedSession(null), false)
})

test('ADMIN pendente e MASTER não iniciam chamadas operacionais', async () => {
  for (const session of [
    { profile: 'ADMIN', setupState: 'PENDENTE' },
    { profile: 'MASTER', setupState: null },
  ]) {
    let operationalCalls = 0
    const result = await loadSessionBeforeOperational({
      loadCurrentUser: async () => session,
      loadOperationalData: async () => { operationalCalls += 1; return {} },
    })
    assert.equal(result.status, 'session-only')
    assert.equal(operationalCalls, 0)
  }
})

test('estado ausente, desconhecido ou resposta inválida rejeita a restauração', async () => {
  for (const session of [
    { profile: 'ADMIN', setupState: '' },
    { profile: 'ADMIN', setupState: 'DESCONHECIDA' },
    {},
    null,
  ]) {
    let operationalCalls = 0
    await assert.rejects(loadSessionBeforeOperational({
      loadCurrentUser: async () => session,
      loadOperationalData: async () => { operationalCalls += 1 },
    }), /Não foi possível confirmar/)
    assert.equal(operationalCalls, 0)
  }
})

test('ADMIN concluído, PORTARIA e MORADOR carregam somente depois de /usuarios/me', async () => {
  for (const session of [
    { profile: 'ADMIN', setupState: 'CONCLUIDA' },
    { profile: 'PORTARIA' },
    { profile: 'MORADOR' },
  ]) {
    const order = []
    const result = await loadSessionBeforeOperational({
      loadCurrentUser: async () => { order.push('session'); return session },
      loadOperationalData: async () => { order.push('operational'); return { units: [] } },
    })
    assert.equal(result.status, 'operational')
    assert.deepEqual(order, ['session', 'operational'])
  }
})

test('401, 403 e erro de rede em /usuarios/me nunca liberam carregamento operacional', async () => {
  for (const error of [new ApiError(401, 'Sessão expirada'), new ApiError(403, 'Acesso negado'), new ApiError(0, 'Servidor indisponível')]) {
    let operationalCalls = 0
    await assert.rejects(loadSessionBeforeOperational({
      loadCurrentUser: async () => { throw error },
      loadOperationalData: async () => { operationalCalls += 1 },
    }), error)
    assert.equal(operationalCalls, 0)
  }
})

test('erro operacional ocorre somente depois da sessão autorizada e permanece recuperável', async () => {
  const error = new ApiError(500, 'Falha nos cadastros')
  const result = await loadSessionBeforeOperational({
    loadCurrentUser: async () => ({ profile: 'ADMIN', setupState: 'CONCLUIDA' }),
    loadOperationalData: async () => { throw error },
  })
  assert.equal(result.status, 'operational-error')
  assert.equal(result.session.profile, 'ADMIN')
  assert.equal(result.error, error)
})

test('resposta antiga de sessão ou de dados operacionais é descartada', async () => {
  let current = true
  let releaseSession
  const delayedSession = new Promise((resolve) => { releaseSession = resolve })
  let operationalCalls = 0
  const staleSession = loadSessionBeforeOperational({
    loadCurrentUser: () => delayedSession,
    loadOperationalData: async () => { operationalCalls += 1; return {} },
    isCurrent: () => current,
  })
  current = false
  releaseSession({ profile: 'ADMIN', setupState: 'CONCLUIDA' })
  assert.deepEqual(await staleSession, { status: 'stale' })
  assert.equal(operationalCalls, 0)

  current = true
  let releaseOperational
  const delayedOperational = new Promise((resolve) => { releaseOperational = resolve })
  const staleOperational = loadSessionBeforeOperational({
    loadCurrentUser: async () => ({ profile: 'ADMIN', setupState: 'CONCLUIDA' }),
    loadOperationalData: () => delayedOperational,
    isCurrent: () => current,
  })
  await Promise.resolve()
  current = false
  releaseOperational({ units: [{ id: 'sessao-antiga' }] })
  assert.deepEqual(await staleOperational, { status: 'stale' })
})

test('MASTER acessa somente a plataforma', () => {
  assert.equal(decide('MASTER', SESSION_AREA.PLATFORM).status, SESSION_ACCESS.ALLOWED)
  for (const area of [SESSION_AREA.ADMIN, SESSION_AREA.ADMIN_SETUP, SESSION_AREA.PORTARIA, SESSION_AREA.MORADOR]) {
    assert.deepEqual(decide('MASTER', area), { status: SESSION_ACCESS.REDIRECT, destination: '/plataforma' })
  }
})

test('ADMIN pendente vai ao Wizard e não contorna rotas administrativas', () => {
  assert.deepEqual(decide('ADMIN', SESSION_AREA.ADMIN, 'PENDENTE'), { status: SESSION_ACCESS.REDIRECT, destination: '/admin/configuracao-inicial' })
  assert.equal(decide('ADMIN', SESSION_AREA.ADMIN_SETUP, 'PENDENTE').status, SESSION_ACCESS.ALLOWED)
  assert.equal(sessionHome({ perfil: 'ADMIN', configuracaoInicial: 'PENDENTE' }), '/admin/configuracao-inicial')
})

test('ADMIN concluído entra no Dashboard e não volta ao Wizard', () => {
  assert.equal(decide('ADMIN', SESSION_AREA.ADMIN, 'CONCLUIDA').status, SESSION_ACCESS.ALLOWED)
  assert.deepEqual(decide('ADMIN', SESSION_AREA.ADMIN_SETUP, 'CONCLUIDA'), { status: SESSION_ACCESS.REDIRECT, destination: '/admin' })
})

test('estado administrativo desconhecido falha fechado', () => {
  for (const state of [undefined, null, '', 'PROCESSANDO']) {
    assert.equal(decide('ADMIN', SESSION_AREA.ADMIN, state).status, SESSION_ACCESS.UNKNOWN)
    assert.equal(decide('ADMIN', SESSION_AREA.ADMIN_SETUP, state).status, SESSION_ACCESS.UNKNOWN)
  }
})

test('PORTARIA e MORADOR preservam suas áreas e não acessam a plataforma', () => {
  assert.equal(decide('PORTARIA', SESSION_AREA.PORTARIA).status, SESSION_ACCESS.ALLOWED)
  assert.equal(decide('MORADOR', SESSION_AREA.MORADOR).status, SESSION_ACCESS.ALLOWED)
  assert.deepEqual(decide('PORTARIA', SESSION_AREA.PLATFORM), { status: SESSION_ACCESS.REDIRECT, destination: '/portaria' })
  assert.deepEqual(decide('MORADOR', SESSION_AREA.PLATFORM), { status: SESSION_ACCESS.REDIRECT, destination: '/morador' })
})

test('sessão ausente ou inválida nunca libera uma rota', () => {
  for (const invalidToken of ['', 'token-invalido']) {
    assert.deepEqual(decideSessionAccess({ token: invalidToken, user: { perfil: 'MASTER' }, area: SESSION_AREA.PLATFORM }), { status: SESSION_ACCESS.NO_SESSION, destination: '/' })
  }
})

test('resolver consulta /usuarios/me e mantém falhas fechadas', async () => {
  const token = tokenFor('ADMIN')
  let calls = 0
  const pending = await resolveSessionAccess({ area: SESSION_AREA.ADMIN, token, loadCurrentUser: async () => { calls += 1; return { perfil: 'ADMIN', configuracaoInicial: 'PENDENTE' } } })
  assert.equal(calls, 1)
  assert.equal(pending.destination, '/admin/configuracao-inicial')

  const unavailable = await resolveSessionAccess({ area: SESSION_AREA.ADMIN, token, loadCurrentUser: async () => { throw new ApiError(0, 'Sem conexão') } })
  assert.deepEqual(unavailable, { status: SESSION_ACCESS.ERROR, destination: '', message: 'Sem conexão' })
  const expired = await resolveSessionAccess({ area: SESSION_AREA.ADMIN, token, loadCurrentUser: async () => { throw new ApiError(401, 'Expirada') } })
  assert.deepEqual(expired, { status: SESSION_ACCESS.NO_SESSION, destination: '/' })
})

test('síndico que mora no condomínio também acessa a área do morador', () => {
  const token = jwt({ perfil: 'ADMIN', condominio_id: 'c-1', exp: Math.floor(Date.now() / 1000) + 3600 })
  const sindico = { perfil: 'ADMIN', configuracaoInicial: 'CONCLUIDA', apartamentoId: 'a-101' }
  assert.equal(decideSessionAccess({ token, user: sindico, area: SESSION_AREA.MORADOR }).status, SESSION_ACCESS.ALLOWED)
  assert.equal(decideSessionAccess({ token, user: sindico, area: SESSION_AREA.ADMIN }).status, SESSION_ACCESS.ALLOWED)
  // Sem unidade, ou com a configuração pendente, volta para a área dele
  assert.deepEqual(decideSessionAccess({ token, user: { ...sindico, apartamentoId: null }, area: SESSION_AREA.MORADOR }), { status: SESSION_ACCESS.REDIRECT, destination: '/admin' })
  assert.equal(decideSessionAccess({ token, user: { ...sindico, configuracaoInicial: 'PENDENTE' }, area: SESSION_AREA.MORADOR }).status, SESSION_ACCESS.REDIRECT)
})
