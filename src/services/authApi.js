import { ApiError, apiPost, setToken, tokenClaims } from './api.js'

// Máscara progressiva 000.000.000-00 (o backend grava o CPF formatado, 14 caracteres).
export function formatCpf(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function cpfComplete(value = '') { return String(value).replace(/\D/g, '').length === 11 }

// `perfil` é texto livre no backend (ex.: ADMIN, Portaria, Morador); cada um abre uma área do front.
const profilePaths = { MASTER: '/plataforma', ADMIN: '/admin', ADMINISTRADOR: '/admin', ADMINISTRACAO: '/admin', PORTARIA: '/portaria', PORTEIRO: '/portaria', MORADOR: '/morador' }

export function profilePath(perfil = '') {
  const key = String(perfil).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
  return profilePaths[key] || ''
}

// Autentica na API, guarda o token da sessão e devolve a rota inicial do perfil.
export async function login(cpf, senha, options) {
  let token
  try {
    ({ token } = await apiPost('/auth/login', { cpf: formatCpf(cpf), senha }, options))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw new ApiError(401, 'CPF ou senha inválidos.')
    throw error
  }
  const path = profilePath(tokenClaims(token)?.perfil)
  if (!path) throw new ApiError(403, 'Seu perfil ainda não tem acesso configurado no Condo+. Procure a administração.')
  setToken(token)
  return { path }
}

export function logout() { setToken('') }

// Primeiro acesso: cria a senha de um usuário pré-cadastrado pela Administração e já entra no sistema.
// O backend responde a mesma recusa (403) para CPF inexistente e para quem já tem senha.
// Recuperação de senha por e-mail: o backend responde sempre a mesma mensagem (não revela se o CPF existe)
export const RECOVERY_SENT = 'Se o CPF estiver cadastrado com um e-mail, enviamos um link para criar uma nova senha. Ele vale por 30 minutos.'
export const RECOVERY_LINK_INVALID = 'Este link de recuperação é inválido ou expirou. Peça um novo.'

export async function recuperarSenha(cpf, options) {
  try {
    const resposta = await apiPost('/auth/recuperar-senha', { cpf: formatCpf(cpf) }, options)
    return resposta?.mensagem || RECOVERY_SENT
  } catch (error) {
    // 503 = envio de e-mail não configurado no servidor (o front não exibe texto do backend em 5xx)
    if (error instanceof ApiError && error.status === 503) throw new ApiError(503, 'A recuperação de senha por e-mail não está disponível no momento. Procure a administração do condomínio.')
    throw error
  }
}

export async function redefinirSenha(token, novaSenha, options) {
  if (!token?.trim()) throw new ApiError(400, RECOVERY_LINK_INVALID)
  const resposta = await apiPost('/auth/redefinir-senha', { token: token.trim(), novaSenha }, options)
  return resposta?.mensagem || 'Senha alterada com sucesso. Você já pode entrar com a nova senha.'
}

export async function primeiroAcesso(cpf, novaSenha, options) {
  try {
    await apiPost('/auth/primeiro-acesso', { cpf: formatCpf(cpf), novaSenha }, options)
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) throw new ApiError(403, 'Não encontramos um cadastro pendente de ativação para este CPF. Se você já criou sua senha, entre pelo login ou use “Esqueci minha senha”.')
    throw error
  }
  return login(cpf, novaSenha, options)
}
