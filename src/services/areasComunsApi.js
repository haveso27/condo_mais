import { ApiError, apiPost, apiPut } from './api.js'
import { matchesQuery, nextId, updateById } from './serviceUtils.js'

// Formulário -> AreaComumDTO. Aprovação só vale para área reservável; capacidade é opcional.
export function areaBody(form) {
  const name = String(form.name || '').trim()
  if (!name) throw new ApiError(400, 'Informe o nome da área comum.')
  const bookable = Boolean(form.bookable)
  const capacityText = String(form.capacity ?? '').trim()
  const capacity = capacityText ? Number(capacityText) : null
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) throw new ApiError(400, 'A capacidade deve ser um número inteiro maior que zero.')
  // Taxa de uso em reais (vírgula ou ponto); vazia ou zero = gratuita. Só vale para área reservável.
  const feeText = String(form.feeValue ?? '').trim().replace(',', '.')
  const fee = bookable && feeText ? Number(feeText) : null
  if (fee !== null && (!Number.isFinite(fee) || fee < 0 || Math.round(fee * 100) !== fee * 100)) throw new ApiError(400, 'A taxa deve ser um valor em reais, com até 2 casas decimais.')
  return {
    nome: name,
    descricao: String(form.description || '').trim() || null,
    regras: String(form.rules || '').trim() || null,
    reservavel: bookable,
    exigeAprovacao: bookable && Boolean(form.requiresApproval),
    capacidade: capacity,
    taxa: fee || null,
    instrucoesPagamento: fee ? String(form.paymentInstructions || '').trim() || null : null,
  }
}

// Nome repetido é recusado pelo backend (409); conferir antes poupa a ida ao servidor
export function areaNameTaken(areas, name, editingId) {
  const normalized = String(name || '').trim().toLocaleLowerCase('pt-BR')
  return areas.some((area) => area.id !== editingId && area.name.trim().toLocaleLowerCase('pt-BR') === normalized)
}

export function salvarAreaComum(form, editingId, options) {
  const body = areaBody(form)
  return editingId ? apiPut(`/condominios/areas-comuns/${editingId}`, body, options) : apiPost('/condominios/areas-comuns', body, options)
}

export function alterarStatusAreaComum(id, active, options) {
  return apiPut(`/condominios/areas-comuns/${id}/${active ? 'ativar' : 'desativar'}`, undefined, options)
}

// Modo demonstração (sem API): mesma forma de dados, guardada só na memória
export const areasService = {
  listar(records, { query = '', statuses = [] } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)))
  },
  criar(records, payload) {
    const bookable = Boolean(payload.bookable)
    const record = { ...payload, id: nextId('ARE', records), bookable, requiresApproval: bookable && Boolean(payload.requiresApproval), active: true, status: 'ATIVO' }
    return { records: [...records, record], record }
  },
  atualizar(records, id, patch) { return updateById(records, id, patch) },
}
