import { matchesQuery, nextId, updateById } from './serviceUtils.js'
import { reservationPeriod, reservationPeriodError } from './reservasApi.js'

// Compara o período completo (data e hora), inclusive o que passa da meia-noite
function overlaps(a, b) {
  const first = reservationPeriod(a)
  const second = reservationPeriod(b)
  return first.start < second.end && first.end > second.start
}

export const reservasService = {
  listar(records, { query = '', statuses = [], unit = '', tower = '', area = '' } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!tower || item.tower === tower) && (!unit || item.unit === unit) && (!area || item.area === area))
  },
  verificarDisponibilidade(records, candidate) {
    if (!candidate.area || !candidate.date || !candidate.startTime || !candidate.endTime) return { available: false, message: 'Preencha área, data e horários.' }
    const periodError = reservationPeriodError(candidate)
    if (periodError) return { available: false, message: periodError }
    const occupied = records.some((item) => item.id !== candidate.id && item.area === candidate.area && !['CANCELADA', 'RECUSADA'].includes(item.status) && overlaps(candidate, item))
    return occupied ? { available: false, message: 'Este horário já está ocupado.' } : { available: true, message: 'Horário disponível.' }
  },
  criar(records, payload, currentResident) {
    const pendingApproval = payload.area === 'Salão de Festas' && !currentResident.isOwner
    const record = { ...payload, id: nextId('RES', records), resident: currentResident.name, tower: currentResident.tower, unit: currentResident.unit, requestedByOwner: currentResident.isOwner, status: pendingApproval ? 'AGUARDANDO_APROVACAO' : 'CONFIRMADA' }
    return { records: [record, ...records], record }
  },
  alterarStatus(records, id, status) { return updateById(records, id, { status }) },
}
