import { ApiError, apiDelete, apiGet, apiPost, apiPut, condominioIdFromToken } from './api.js'
import { carregarSessaoAtual } from './sessionApi.js'

function condominioId() {
  const id = condominioIdFromToken()
  if (!id) throw new ApiError(401, 'Sessão inválida ou expirada. Entre novamente.')
  return id
}

// ApartamentoResponseDTO -> unidade das telas. owners/residents vêm dos moradores vinculados.
export function toUnit(apartamento, towerNames = {}) {
  return {
    id: apartamento.id,
    number: apartamento.numero || '',
    tower: apartamento.torreId ? towerNames[apartamento.torreId] || '' : '',
    towerId: apartamento.torreId || '',
    status: (apartamento.status || '').toUpperCase(),
    owners: [],
    residents: [],
  }
}

// UsuarioResponseDTO (perfil MORADOR) -> morador das telas
export function toResident(usuario) {
  return {
    id: usuario.id,
    name: usuario.nome || '',
    cpf: usuario.cpf || '',
    email: usuario.email || '',
    phone: usuario.telefone || '',
    tower: usuario.torreNome || '',
    unit: usuario.apartamentoNumero || '',
    unitId: usuario.apartamentoId || '',
    relation: usuario.vinculo || '',
    isOwner: usuario.vinculo === 'PROPRIETARIO',
    status: usuario.status || 'ATIVO',
    pendingFirstAccess: Boolean(usuario.primeiroAcessoPendente),
  }
}

// Perfil da equipe (Portaria/Administração); valores legados como "Administrador" ou "Porteiro" contam igual
export function staffRole(perfil) {
  const value = String(perfil || '').normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase()
  if (['ADMIN', 'ADMINISTRADOR', 'ADMINISTRACAO'].includes(value)) return 'ADMIN'
  if (['PORTARIA', 'PORTEIRO'].includes(value)) return 'PORTARIA'
  return ''
}

// UsuarioResponseDTO (perfil ADMIN ou PORTARIA) -> usuário da equipe
export function toStaff(usuario) {
  return {
    id: usuario.id,
    name: usuario.nome || '',
    cpf: usuario.cpf || '',
    email: usuario.email || '',
    phone: usuario.telefone || '',
    role: staffRole(usuario.perfil),
    status: usuario.status || 'ATIVO',
    pendingFirstAccess: Boolean(usuario.primeiroAcessoPendente),
    // Síndico que também mora no condomínio
    livesHere: Boolean(usuario.apartamentoId),
    tower: usuario.torreNome || '',
    unit: usuario.apartamentoNumero || '',
    relation: usuario.vinculo || '',
  }
}

// Preenche proprietários/moradores de cada unidade a partir dos moradores ativos
export function linkResidents(units, residents) {
  return units.map((unit) => {
    const linked = residents.filter((resident) => resident.unitId === unit.id && resident.status === 'ATIVO')
    return { ...unit, owners: linked.filter((resident) => resident.isOwner).map((resident) => resident.name), residents: linked.map((resident) => resident.name) }
  })
}

// Torres, unidades, moradores e equipe do condomínio do token. Usuários só vêm para ADMIN (403 para os
// demais; 404 em backend sem /usuarios).
export async function carregarCadastros(options) {
  const id = condominioId()
  const [torres, apartamentos, usuarios] = await Promise.all([
    apiGet('/condominios/torres', { condominioId: id }, options),
    apiGet('/condominios/apartamentos', { condominioId: id }, options),
    apiGet('/usuarios', {}, options).catch((error) => { if ([403, 404].includes(error.status)) return []; throw error }),
  ])
  const towers = torres.map((torre) => ({ id: torre.id, name: torre.nome })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const towerNames = Object.fromEntries(towers.map((tower) => [tower.id, tower.name]))
  const residents = usuarios.filter((usuario) => usuario.perfil === 'MORADOR').map(toResident)
  // A unidade também mostra o síndico que mora nela (ele não entra na lista de moradores, que é editada como morador)
  const adminResidents = usuarios.filter((usuario) => staffRole(usuario.perfil) === 'ADMIN' && usuario.apartamentoId).map(toResident)
  const units = linkResidents(apartamentos.map((apartamento) => toUnit(apartamento, towerNames)), [...residents, ...adminResidents])
  const staff = usuarios.filter((usuario) => staffRole(usuario.perfil)).map(toStaff)
  return { towers, units, residents, staff }
}

// Usuário logado (GET /usuarios/me, qualquer perfil): monta a área do morador com os dados reais
export async function carregarUsuarioLogado(options) {
  const usuario = await carregarSessaoAtual(options)
  return {
    // O perfil decide o atalho entre as visões de administrador e de morador
    currentResident: { ...toResident(usuario), profile: staffRole(usuario.perfil) || String(usuario.perfil || '').toUpperCase() },
    condominiumName: usuario.condominioNome || '',
    profile: usuario.perfil || '',
    setupState: usuario.configuracaoInicial || '',
    condominiumModel: usuario.modeloCondominio || '',
  }
}

export async function criarTorre(nome, options) {
  if (!nome?.trim()) throw new ApiError(400, 'Informe o nome da torre.')
  return apiPost('/condominios/torres', { nome: nome.trim(), condominioId: condominioId() }, options)
}

export async function salvarUnidade(form, editingId, towers, options) {
  const tower = towers.find((item) => item.name === form.tower)
  if (!tower) throw new ApiError(400, 'Selecione uma Torre / Bloco existente.')
  const body = { numero: form.number.trim(), status: form.status, torreId: tower.id, condominioId: condominioId() }
  return editingId ? apiPut(`/condominios/apartamentos/${editingId}`, body, options) : apiPost('/condominios/apartamentos', body, options)
}

export function excluirUnidade(id, options) { return apiDelete(`/condominios/apartamentos/${id}`, options) }

// Exclui a torre junto com as unidades dela (corrige uma torre cadastrada errada). O backend recusa (409, dizendo
// o quê) se alguma unidade tiver morador, encomenda, visita ou chamado, ou se houver aviso para a torre.
export function excluirTorre(id, options) { return apiDelete(`/condominios/torres/${id}`, options) }

export function towerDeletionMessage(towerName, units = []) {
  if (!towerName) return 'Selecione a torre que será excluída.'
  const count = units.filter((unit) => unit.tower === towerName).length
  const what = count === 0 ? 'Ela não tem unidades.' : count === 1 ? 'A unidade dela também será excluída.' : `As ${count} unidades dela também serão excluídas.`
  return `A torre "${towerName}" será excluída definitivamente. ${what} Só é possível se nenhuma unidade tiver morador, encomenda, visita ou chamado, nem houver aviso para a torre. Use para corrigir uma torre cadastrada errada e depois cadastre de novo.`
}

export async function salvarMorador(form, editingId, units, options) {
  const unit = units.find((item) => item.tower === form.tower && item.number === String(form.unit).trim())
  if (!unit) throw new ApiError(400, 'Selecione uma unidade existente nesta Torre / Bloco.')
  const body = { nome: form.name, cpf: form.cpf, email: form.email, telefone: form.phone, perfil: 'MORADOR', apartamentoId: unit.id, vinculo: form.relation }
  return editingId ? apiPut(`/usuarios/${editingId}`, body, options) : apiPost('/usuarios', body, options)
}

// Portaria/Administração: sem unidade nem vínculo; e-mail e telefone são opcionais
export async function salvarUsuarioEquipe(form, editingId, units = [], options) {
  const perfil = staffRole(form.role)
  if (!perfil) throw new ApiError(400, 'Selecione o perfil: Portaria ou Administração.')
  // Síndico que também mora no condomínio: unidade e vínculo, como um morador (a portaria não tem unidade)
  let apartamentoId = null
  let vinculo = null
  if (perfil === 'ADMIN' && form.livesHere) {
    const unit = units.find((item) => item.number === String(form.unit || '').trim() && (item.tower || '') === (form.tower || ''))
    if (!unit) throw new ApiError(400, 'Selecione a unidade onde o síndico mora.')
    if (!['PROPRIETARIO', 'INQUILINO'].includes(form.relation)) throw new ApiError(400, 'Selecione o vínculo com a unidade: proprietário ou inquilino.')
    apartamentoId = unit.id
    vinculo = form.relation
  }
  const body = { nome: form.name?.trim(), cpf: form.cpf?.trim(), email: form.email?.trim() || '', telefone: form.phone?.trim() || '', perfil, apartamentoId, vinculo }
  return editingId ? apiPut(`/usuarios/${editingId}`, body, options) : apiPost('/usuarios', body, options)
}

// Ativar/desativar vale para qualquer usuário do condomínio (morador ou equipe)
export function alterarStatusMorador(id, status, options) {
  return apiPut(`/usuarios/${id}/${status === 'INATIVO' ? 'desativar' : 'ativar'}`, undefined, options)
}
