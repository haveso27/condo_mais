import { matchesQuery, nextId, nowLabel, updateById } from './serviceUtils.js'

function asDate(date, time) {
  if (!date || !time) return null
  const value = new Date(`${date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

// Mesmas regras do backend: término depois do início e no máximo 30 dias (autorização é por visita, não permanente)
const MAX_AUTHORIZATION_DAYS = 30
export function visitPeriodError(values) {
  const start = asDate(values.startDate, values.startTime)
  const end = asDate(values.endDate, values.endTime)
  if (!start || !end) return ''
  if (end <= start) return 'O término da autorização deve ser posterior ao início.'
  return end - start > MAX_AUTHORIZATION_DAYS * 86_400_000 ? `O término da autorização pode ser no máximo ${MAX_AUTHORIZATION_DAYS} dias depois do início.` : ''
}

export function visitorEffectiveStatus(record, now = new Date()) {
  const end = asDate(record.endDate, record.endTime)
  if (end && end < now && ['PENDENTE', 'AUTORIZADO'].includes(record.status)) return 'EXPIRADO'
  return record.status
}

export function visitorEntryError(record, now = new Date()) {
  if (!record) return 'Visitante não encontrado.'
  const start = asDate(record.startDate, record.startTime)
  const end = asDate(record.endDate, record.endTime)
  if (!start || !end) return 'O período da autorização está incompleto.'
  if (now < start) return 'Entrada indisponível: a autorização ainda não iniciou.'
  if (now > end) return 'Entrada indisponível: a autorização expirou.'
  if (record.status !== 'AUTORIZADO') return 'A entrada exige uma autorização válida.'
  return ''
}

export const visitantesService = {
  listar(records, { query = '', statuses = [], tower = '', unit = '' } = {}) {
    return records.map((item) => ({ ...item, status: visitorEffectiveStatus(item) })).filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!tower || item.tower === tower) && (!unit || item.unit === unit))
  },
  podeAutorizar(residents, currentResident) {
    return residents.some((item) => item.id === currentResident.id && item.status === 'ATIVO' && item.tower === currentResident.tower && item.unit === currentResident.unit && ['PROPRIETARIO', 'INQUILINO'].includes(item.relation))
  },
  criar(records, payload, source = 'PORTARIA') {
    const record = { ...payload, id: nextId('VIS', records), status: payload.authorized ? 'AUTORIZADO' : (source === 'MORADOR' ? 'AUTORIZADO' : 'PENDENTE'), source }
    delete record.authorized
    return { records: [record, ...records], record }
  },
  alterarStatus(records, id, status) {
    if (status === 'ENTROU' && visitorEntryError(records.find((item) => item.id === id))) return records
    const timestamps = status === 'ENTROU' ? { entryAt: nowLabel() } : status === 'SAIU' ? { exitAt: nowLabel() } : {}
    return updateById(records, id, { status, ...timestamps })
  },
}
