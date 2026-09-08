import { matchesQuery, nextId, nowLabel, updateById } from './serviceUtils'

export const encomendasService = {
  listar(records, { query = '', statuses = [], tower = '', unit = '', doorman = '' } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!tower || item.tower === tower) && (!unit || item.unit === unit) && (!doorman || item.doorman === doorman))
  },
  criar(records, payload, resident = 'Morador não identificado') {
    const record = { ...payload, id: nextId('ENC', records), resident, receivedAt: nowLabel(), doorman: 'João Oliveira', status: 'AGUARDANDO_RETIRADA' }
    return { records: [record, ...records], record }
  },
  alterarStatus(records, id, status) {
    return updateById(records, id, { status, ...(status === 'RETIRADA' ? { withdrawnAt: nowLabel() } : {}) })
  },
}
