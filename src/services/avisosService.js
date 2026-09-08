import { matchesQuery, nextId, updateById } from './serviceUtils'

export const avisosService = {
  listar(records, { query = '', statuses = [], priority = '', destination = '' } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!priority || item.priority === priority) && (!destination || item.destination === destination))
  },
  criar(records, payload) {
    const record = { ...payload, id: nextId('AVI', records), status: 'ATIVO' }
    return { records: [record, ...records], record }
  },
  atualizar(records, id, patch) { return updateById(records, id, patch) },
}
