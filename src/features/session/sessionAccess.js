import { ApiError, endExpiredSession, getToken, tokenClaims, tokenExpired } from '../../services/api.js'
import { carregarSessaoAtual } from '../../services/sessionApi.js'

export const SESSION_AREA = Object.freeze({
  PLATFORM: 'platform',
  ADMIN: 'admin',
  ADMIN_SETUP: 'admin-setup',
  PORTARIA: 'portaria',
  MORADOR: 'morador',
})

export const SESSION_ACCESS = Object.freeze({
  ALLOWED: 'allowed',
  REDIRECT: 'redirect',
  NO_SESSION: 'no-session',
  UNKNOWN: 'unknown',
  ERROR: 'error',
})

export function normalizeProfile(profile = '') {
  const normalized = String(profile).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
  if (['ADMIN', 'ADMINISTRADOR', 'ADMINISTRACAO'].includes(normalized)) return 'ADMIN'
  if (['PORTARIA', 'PORTEIRO'].includes(normalized)) return 'PORTARIA'
  return normalized
}

export function normalizeSetupState(value = '') {
  return String(value).trim().toUpperCase()
}

export function canLoadOperationalData(user) {
  const profile = normalizeProfile(user?.profile || user?.perfil)
  if (profile === 'ADMIN') return normalizeSetupState(user?.setupState || user?.configuracaoInicial) === 'CONCLUIDA'
  return profile === 'PORTARIA' || profile === 'MORADOR'
}

export function isConfirmedSession(user) {
  const profile = normalizeProfile(user?.profile || user?.perfil)
  if (['MASTER', 'PORTARIA', 'MORADOR'].includes(profile)) return true
  if (profile !== 'ADMIN') return false
  return ['PENDENTE', 'CONCLUIDA'].includes(normalizeSetupState(user?.setupState || user?.configuracaoInicial))
}

export async function loadSessionBeforeOperational({
  loadCurrentUser,
  loadOperationalData,
  isCurrent = () => true,
} = {}) {
  const session = await loadCurrentUser()
  if (!isCurrent()) return { status: 'stale' }
  if (!isConfirmedSession(session)) throw new ApiError(403, 'Não foi possível confirmar o perfil ou o estado da configuração.')
  if (!canLoadOperationalData(session)) return { status: 'session-only', session }

  let operational
  try {
    operational = await loadOperationalData(session)
  } catch (error) {
    if (!isCurrent()) return { status: 'stale' }
    return { status: 'operational-error', session, error }
  }
  if (!isCurrent()) return { status: 'stale' }
  return { status: 'operational', session, operational }
}

// Administrador com unidade vinculada e condomínio configurado: também é morador
export function isResidentAdmin(user) {
  return normalizeProfile(user?.perfil) === 'ADMIN' && Boolean(user?.apartamentoId)
    && normalizeSetupState(user?.configuracaoInicial) === 'CONCLUIDA'
}

export function sessionHome(user) {
  const profile = normalizeProfile(user?.perfil)
  if (profile === 'MASTER') return '/plataforma'
  if (profile === 'PORTARIA') return '/portaria'
  if (profile === 'MORADOR') return '/morador'
  if (profile === 'ADMIN') {
    const setup = normalizeSetupState(user?.configuracaoInicial)
    if (setup === 'PENDENTE') return '/admin/configuracao-inicial'
    if (setup === 'CONCLUIDA') return '/admin'
  }
  return ''
}

function redirectToOwnArea(user) {
  const destination = sessionHome(user)
  return destination
    ? { status: SESSION_ACCESS.REDIRECT, destination }
    : { status: SESSION_ACCESS.UNKNOWN, destination: '' }
}

export function decideSessionAccess({ token, user, area, now = Date.now() }) {
  if (!token || !tokenClaims(token) || tokenExpired(token, now)) return { status: SESSION_ACCESS.NO_SESSION, destination: '/' }
  if (!user || typeof user !== 'object') return { status: SESSION_ACCESS.UNKNOWN, destination: '' }

  const profile = normalizeProfile(user.perfil)
  if (area === SESSION_AREA.PLATFORM) {
    return profile === 'MASTER' ? { status: SESSION_ACCESS.ALLOWED, destination: '' } : redirectToOwnArea(user)
  }

  if (area === SESSION_AREA.ADMIN || area === SESSION_AREA.ADMIN_SETUP) {
    if (profile !== 'ADMIN') return redirectToOwnArea(user)
    const setup = normalizeSetupState(user.configuracaoInicial)
    if (!['PENDENTE', 'CONCLUIDA'].includes(setup)) return { status: SESSION_ACCESS.UNKNOWN, destination: '' }
    if (area === SESSION_AREA.ADMIN_SETUP) {
      return setup === 'PENDENTE'
        ? { status: SESSION_ACCESS.ALLOWED, destination: '' }
        : { status: SESSION_ACCESS.REDIRECT, destination: '/admin' }
    }
    return setup === 'CONCLUIDA'
      ? { status: SESSION_ACCESS.ALLOWED, destination: '' }
      : { status: SESSION_ACCESS.REDIRECT, destination: '/admin/configuracao-inicial' }
  }

  const expectedProfile = area === SESSION_AREA.PORTARIA ? 'PORTARIA' : area === SESSION_AREA.MORADOR ? 'MORADOR' : ''
  if (!expectedProfile) return { status: SESSION_ACCESS.UNKNOWN, destination: '' }
  // O síndico que também mora no condomínio (admin com unidade) usa a visão de morador
  if (area === SESSION_AREA.MORADOR && isResidentAdmin(user)) return { status: SESSION_ACCESS.ALLOWED, destination: '' }
  return profile === expectedProfile ? { status: SESSION_ACCESS.ALLOWED, destination: '' } : redirectToOwnArea(user)
}

export async function resolveSessionAccess({
  area,
  token = getToken(),
  loadCurrentUser = carregarSessaoAtual,
  now = Date.now(),
} = {}) {
  if (!token || !tokenClaims(token)) return { status: SESSION_ACCESS.NO_SESSION, destination: '/' }
  // Token vencido nem chega ao servidor: a sessão termina aqui, com aviso no login
  if (tokenExpired(token, now)) {
    if (token === getToken()) endExpiredSession()
    return { status: SESSION_ACCESS.NO_SESSION, destination: '/' }
  }
  try {
    const user = await loadCurrentUser()
    return decideSessionAccess({ token, user, area })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { status: SESSION_ACCESS.NO_SESSION, destination: '/' }
    return {
      status: SESSION_ACCESS.ERROR,
      destination: '',
      message: error?.message || 'Não foi possível verificar sua sessão.',
    }
  }
}
