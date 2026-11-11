import { ApiError, apiGet, apiPost, apiPut } from './api.js'
import { packageTimeLabel } from './encomendasApi.js'

export const TICKET_COMMON_AREA = 'Área comum / condomínio'

// Rótulo de unidade nos formulários de chamado: "101 · Torre A" (ou só o número, sem torre)
export function ticketUnitLabel(unit) {
  return unit.tower ? `${unit.number} · ${unit.tower}` : unit.number
}

const statusFromApi = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '_')

// HistoricoChamadoDTO -> linha do histórico ("STATUS: ABERTO -> EM ANALISE", comentário, quem e quando)
export function toTicketHistory(item) {
  return {
    action: item.acao || '',
    comment: item.comentario || '',
    author: item.usuarioNome || '',
    createdAt: packageTimeLabel(item.dataHora),
  }
}

// ChamadoResponseDTO -> chamado das telas. O histórico só vem no detalhe.
export function toTicket(chamado) {
  const unit = chamado.apartamentoNumero || ''
  const tower = chamado.torreNome || ''
  return {
    id: chamado.id,
    code: `#${String(chamado.id || '').slice(0, 8).toUpperCase()}`,
    title: chamado.titulo || '',
    description: chamado.descricao || '',
    category: chamado.categoriaNome || '',
    categoryId: chamado.categoriaId || '',
    unitId: chamado.apartamentoId || '',
    unit,
    tower,
    location: chamado.apartamentoId ? `Unidade ${[unit, tower].filter(Boolean).join(' · ')}` : 'Área comum',
    resident: chamado.solicitanteNome || '',
    requesterId: chamado.solicitanteId || '',
    priority: String(chamado.prioridade || 'NORMAL').toUpperCase(),
    status: statusFromApi(chamado.status),
    openedAt: packageTimeLabel(chamado.dataAbertura),
    closedAt: packageTimeLabel(chamado.dataEncerramento),
    provider: chamado.responsavelExterno || '',
    providerContact: chamado.contatoExterno || '',
    forecast: chamado.dataPrevisaoAtendimento || '',
    ...(Array.isArray(chamado.historico) ? { history: chamado.historico.map(toTicketHistory) } : {}),
  }
}

// A portaria não tem acesso às ocorrências (o backend responde 403): para ela a lista fica vazia
export async function carregarChamados(options) {
  try {
    const chamados = await apiGet('/atendimento/chamados', {}, options)
    return (chamados || []).map(toTicket)
  } catch (error) {
    if (error.status === 403) return []
    throw error
  }
}

export async function carregarChamado(id, options) {
  return toTicket(await apiGet(`/atendimento/chamados/${id}`, {}, options))
}

// Categorias do condomínio; o backend garante "Outros" na primeira consulta
export async function carregarCategoriasChamado(options) {
  const categorias = await apiGet('/atendimento/categorias', {}, options)
  return (categorias || []).map((categoria) => ({ id: categoria.id, name: categoria.nome || '' }))
}

// Formulário -> AberturaChamadoDTO. Sem categoria, o backend usa "Outros"; sem unidade, é área comum.
export function ticketBody(form, { units = [], categories = [] } = {}) {
  const title = String(form.title || '').trim()
  const description = String(form.description || '').trim()
  if (!title || !description) throw new ApiError(400, 'Preencha o título e a descrição do chamado.')
  let categoriaId = null
  if (form.category) {
    const category = categories.find((item) => item.name === form.category)
    if (!category) throw new ApiError(400, 'Selecione uma categoria existente.')
    categoriaId = category.id
  }
  let apartamentoId = null
  if (form.location && form.location !== TICKET_COMMON_AREA) {
    const unit = units.find((item) => ticketUnitLabel(item) === form.location)
    if (!unit) throw new ApiError(400, 'Selecione uma unidade existente.')
    apartamentoId = unit.id
  }
  return { titulo: title, descricao: description, categoriaId, apartamentoId, prioridade: form.priority || 'NORMAL', imagemUrl: null }
}

export function abrirChamado(form, lookups, options) {
  return apiPost('/atendimento/chamados', ticketBody(form, lookups), options)
}

// Andamento pela administração: status (com _ ou espaço) e/ou nova categoria; o comentário vai junto ao histórico
// Próximos status que a administração pode escolher: resolvido não é reaberto, só encerrado
export function ticketNextStatuses(status) {
  if (status === 'RESOLVIDO') return ['ENCERRADO']
  return ['EM_ANALISE', 'EM_ATENDIMENTO', 'RESOLVIDO', 'ENCERRADO'].filter((next) => next !== status)
}

export function atualizarChamado(id, { status, categoryId, comment } = {}, options) {
  const body = { status: status || null, categoriaId: categoryId || null, comentario: String(comment || '').trim() || null }
  return apiPut(`/atendimento/chamados/${id}`, body, options)
}

export function comentarChamado(id, comment, options) {
  const text = String(comment || '').trim()
  if (!text) throw new ApiError(400, 'Escreva o comentário.')
  return apiPost(`/atendimento/chamados/${id}/comentarios`, { comentario: text }, options)
}
