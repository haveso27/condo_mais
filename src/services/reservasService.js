import { matchesQuery, nextId, updateById } from './serviceUtils'

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

export const reservasService = {
  listar(records, { query = '', statuses = [], unit = '', area = '' } = {}) {
    return records.filter((item) => matchesQuery(item, query) && (!statuses.length || statuses.includes(item.status)) && (!unit || item.unit === unit) && (!area || item.area === area))
  },
  verificarDisponibilidade(records, candidate) {
    if (!candidate.area || !candidate.date || !candidate.startTime || !candidate.endTime) return { available: false, message: 'Preencha área, data e horários.' }
    if (candidate.startTime >= candidate.endTime) return { available: false, message: 'O horário final deve ser posterior ao inicial.' }
    const occupied = records.some((item) => item.id !== candidate.id && item.area === candidate.area && item.date === candidate.date && !['CANCELADA', 'RECUSADA'].includes(item.status) && overlaps(candidate.startTime, candidate.endTime, item.startTime, item.endTime))
    return occupied ? { available: false, message: 'Este horário já está ocupado.' } : { available: true, message: 'Horário disponível.' }
  },
  criar(records, payload, currentResident) {
    const pendingApproval = payload.area === 'Salão de Festas' && !currentResident.isOwner
    const record = { ...payload, id: nextId('RES', records), resident: currentResident.name, tower: currentResident.tower, unit: currentResident.unit, requestedByOwner: currentResident.isOwner, status: pendingApproval ? 'AGUARDANDO_APROVACAO' : 'CONFIRMADA' }
    return { records: [record, ...records], record }
  },
  alterarStatus(records, id, status) { return updateById(records, id, { status }) },
}
