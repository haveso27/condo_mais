import { matchesQuery, nextId, nowLabel, updateById } from './serviceUtils.js'

export const prestadoresService = {
  listar(records, { query = '', statuses = [], tower = '' } = {}) { return records.filter((item) => matchesQuery(item, query) && (!tower || item.tower === tower) && (!statuses.length || statuses.includes(item.status))) },
  criar(records, payload) { const record = { ...payload, id: nextId('PRE', records), status: 'ESPERADO' }; return { records: [record, ...records], record } },
  alterarStatus(records, id, status) { return updateById(records, id, { status, ...(status === 'ENTROU' ? { entryAt: nowLabel() } : {}), ...(status === 'SAIU' ? { exitAt: nowLabel() } : {}) }) },
}
