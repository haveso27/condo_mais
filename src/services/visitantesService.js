import { matchesQuery, nextId, nowLabel, updateById } from './serviceUtils'

export const visitantesService = {
  listar(records, { query = '', statuses = [], tower = '', unit = '' } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!tower || item.tower === tower) && (!unit || item.unit === unit))
  },
  criar(records, payload, source = 'PORTARIA') {
    const record = { ...payload, id: nextId('VIS', records), status: payload.authorized ? 'AUTORIZADO' : (source === 'MORADOR' ? 'AUTORIZADO' : 'PENDENTE'), source }
    delete record.authorized
    return { records: [record, ...records], record }
  },
  alterarStatus(records, id, status) {
    const timestamps = status === 'ENTROU' ? { entryAt: nowLabel() } : status === 'SAIU' ? { exitAt: nowLabel() } : {}
    return updateById(records, id, { status, ...timestamps })
  },
}
