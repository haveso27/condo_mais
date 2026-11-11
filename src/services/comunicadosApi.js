import { ApiError, apiDelete, apiGet, apiPost, apiPut } from './api.js'
import { statusLabel } from './serviceUtils.js'

export const NOTICE_ALL = 'Todo condomínio'
export const NOTICE_TOWER = 'Torre/Bloco específico'

// AvisoResponseDTO -> comunicado das telas. Publicado na hora (startDate = dia da criação);
// dataValidade nula = sem data final; vencido aparece como ENCERRADO.
export function toNotice(aviso) {
  return {
    id: aviso.id,
    title: aviso.titulo || '',
    content: aviso.conteudo || '',
    priority: String(aviso.prioridade || 'NORMAL').toUpperCase(),
    destination: aviso.torreId ? NOTICE_TOWER : NOTICE_ALL,
    tower: aviso.torreNome || '',
    startDate: String(aviso.criadoEm || '').slice(0, 10),
    endDate: aviso.dataValidade || '',
    author: aviso.autorNome || '',
    status: aviso.ativo === false ? 'ENCERRADO' : 'ATIVO',
    // Chamado relacionado: só código, título e status (o backend não manda descrição nem histórico)
    ticketId: aviso.chamadoId || '',
    ticketCode: aviso.chamadoCodigo || '',
    ticketTitle: aviso.chamadoTitulo || '',
    ticket: aviso.chamadoId ? ticketOption({ code: aviso.chamadoCodigo, title: aviso.chamadoTitulo }) : '',
    ticketSummary: aviso.chamadoId ? `${aviso.chamadoCodigo} · ${aviso.chamadoTitulo} · ${statusLabel(String(aviso.chamadoStatus || '').replace(/\s+/g, '_'))}` : '',
  }
}

// Opção do campo "Chamado relacionado": o código das telas e o título
export function ticketOption(ticket) {
  return `${ticket.code} · ${ticket.title}`
}

// Menções @3F2A1C9E no texto (o código das telas, sem o #); fora de e-mails, como no backend
const MENTION = /(?<![\w.])@([0-9A-Fa-f]{8})(?!\w)/g

// Prévia no formulário: cada código mencionado com o título do chamado (null quando não existe)
export function noticeMentions(content, tickets = []) {
  const codes = [...new Set([...String(content || '').matchAll(MENTION)].map((match) => `#${match[1].toUpperCase()}`))]
  return codes.map((code) => ({ code, title: tickets.find((ticket) => ticket.code === code)?.title || null }))
}

// Texto para leitura: a menção do chamado ligado ganha o título ("@3F2A1C9E (Falta de luz)")
export function annotateMentions(notice) {
  if (!notice?.ticketCode) return notice?.content || ''
  const code = notice.ticketCode.replace('#', '').toUpperCase()
  return String(notice.content || '').replace(MENTION, (match, found) => found.toUpperCase() === code ? `${match} (${notice.ticketTitle})` : match)
}

// Comunicados que o token pode ver: portaria/admin, todos (inclusive vencidos); morador, só os ativos dele
export async function carregarComunicados(options) {
  const avisos = await apiGet('/interativo/avisos', {}, options)
  return (avisos || []).map(toNotice)
}

// Formulário -> RegistroAvisoDTO. A torre é escolhida pelo nome entre as do condomínio.
export function noticeBody(form, towers = [], tickets = []) {
  const title = String(form.title || '').trim()
  const content = String(form.content || '').trim()
  if (!title || !content) throw new ApiError(400, 'Preencha o título e o conteúdo do comunicado.')
  let torreId = null
  if (form.destination === NOTICE_TOWER) {
    const tower = towers.find((item) => item.name === form.tower)
    if (!tower) throw new ApiError(400, 'Selecione uma Torre / Bloco existente.')
    torreId = tower.id
  }
  let chamadoId = null
  if (form.ticket) {
    const ticket = tickets.find((item) => ticketOption(item) === form.ticket)
    if (!ticket) throw new ApiError(400, 'Selecione um chamado da lista ou deixe o campo vazio.')
    chamadoId = ticket.id
  }
  return { titulo: title, conteudo: content, prioridade: form.priority || 'NORMAL', dataValidade: form.endDate || null, torreId, chamadoId }
}

export function salvarComunicado(form, editingId, towers, tickets, options) {
  const body = noticeBody(form, towers, tickets)
  return editingId ? apiPut(`/interativo/avisos/${editingId}`, body, options) : apiPost('/interativo/avisos', body, options)
}

export function excluirComunicado(id, options) {
  return apiDelete(`/interativo/avisos/${id}`, options)
}
