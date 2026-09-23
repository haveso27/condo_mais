import { matchesQuery, nextId, updateById } from './serviceUtils'

export const moradoresService = {
  listar(records, { query = '', statuses = [], tower = '', unit = '', relation = '' } = {}) { return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!tower || item.tower === tower) && (!unit || item.unit === unit) && (!relation || item.relation === relation)) },
  criar(records, payload) { const record = { ...payload, isOwner: payload.relation === 'PROPRIETARIO', id: nextId('MOR', records), status: 'ATIVO' }; return { records: [record, ...records], record } },
  atualizar(records, id, patch) { return updateById(records, id, { ...patch, ...(patch.relation ? { isOwner: patch.relation === 'PROPRIETARIO' } : {}) }) },
}

export const unidadesService = {
  listar(records, { query = '', statuses = [], tower = '' } = {}) { return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!tower || item.tower === tower)) },
  criar(records, payload) { const record = { ...payload, id: nextId('UNI', records), owners: payload.owner ? [payload.owner] : [], residents: payload.resident ? [payload.resident] : [] }; delete record.owner; delete record.resident; return { records: [record, ...records], record } },
  atualizar(records, id, patch) { return updateById(records, id, patch) },
}
