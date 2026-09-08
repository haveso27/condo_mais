import { matchesQuery, nextId, nowLabel, updateById } from './serviceUtils'

export const prestadoresService = {
  listar(records, { query = '', statuses = [] } = {}) { return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status))) },
  criar(records, payload) { const record = { ...payload, id: nextId('PRE', records), status: 'ESPERADO' }; return { records: [record, ...records], record } },
  alterarStatus(records, id, status) { return updateById(records, id, { status, ...(status === 'ENTROU' ? { entryAt: nowLabel() } : {}), ...(status === 'SAIU' ? { exitAt: nowLabel() } : {}) }) },
}
