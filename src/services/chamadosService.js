import { matchesQuery, nextId, nowLabel, updateById } from './serviceUtils'

export const chamadosService = {
  listar(records, { query = '', statuses = [], priority = '', category = '' } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!priority || item.priority === priority) && (!category || item.category === category))
  },
  criar(records, payload) {
    const record = { ...payload, id: `#${nextId('CH', records)}`, openedAt: nowLabel(), status: 'ABERTO', comments: [] }
    return { records: [record, ...records], record }
  },
  atualizar(records, id, patch) { return updateById(records, id, patch) },
}
