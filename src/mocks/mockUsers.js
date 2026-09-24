// Contas públicas e fictícias para desenvolvimento. Não constituem autenticação segura.
// Remover ao integrar a autenticação do backend; não é um contrato definitivo de usuário.
export const mockUsers = [
  { email: 'admin@condomais.local', password: 'CondoDev123!', profile: 'ADMINISTRADOR' },
  { email: 'portaria@condomais.local', password: 'CondoDev123!', profile: 'PORTEIRO' },
  { email: 'morador@condomais.local', password: 'CondoDev123!', profile: 'MORADOR' },
]

const profilePaths = { ADMINISTRADOR: '/admin', PORTEIRO: '/portaria', MORADOR: '/morador' }

export function validateMockLogin(email = '', password = '') {
  const invalidFields = []
  if (!email.trim()) invalidFields.push('email')
  if (!password.trim()) invalidFields.push('password')
  if (invalidFields.length) return { error: 'Preencha o e-mail e a senha.', invalidFields }
  const account = mockUsers.find((user) => user.email === email.trim().toLowerCase() && user.password === password)
  if (!account) return { error: 'E-mail ou senha inválidos.', invalidFields: ['email', 'password'] }
  return { path: profilePaths[account.profile] }
}
