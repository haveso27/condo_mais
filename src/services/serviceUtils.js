export function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function matchesQuery(record, query) {
  if (!query) return true
  return normalize(Object.values(record).join(' ')).includes(normalize(query))
}

export function nextId(prefix, records) {
  const highest = records.reduce((max, item) => {
    const number = Number(String(item.id || '').replace(/\D/g, ''))
    return Number.isFinite(number) ? Math.max(max, number) : max
  }, 0)
  return `${prefix}-${highest + 1}`
}

export function updateById(records, id, patch) {
  return records.map((item) => item.id === id ? { ...item, ...patch } : item)
}

export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function nowLabel() {
  return `Hoje · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function statusLabel(value = '') {
  const labels = { EM_ANALISE: 'Em análise', EM_ATENDIMENTO: 'Em atendimento', AGUARDANDO_APROVACAO: 'Aguardando aprovação', AGUARDANDO_RETIRADA: 'Aguardando retirada', CONCLUIDA: 'Concluída', PROPRIETARIO: 'Proprietário', INQUILINO: 'Inquilino', MORADOR: 'Morador', PORTARIA: 'Portaria' }
  return labels[value] || String(value).replaceAll('_', ' ').toLowerCase().replace(/^\S/, (letter) => letter.toUpperCase())
}

// Os mocks operacionais usam torre + número; ainda não referenciam units.id.
export function sameUnit(record, resident) {
  return Boolean(record.tower && resident.tower && record.unit && resident.unit) && record.tower === resident.tower && String(record.unit) === String(resident.unit)
}

export function futureReservations(records, now = new Date()) {
  return records.filter((item) => item.status === 'CONFIRMADA' && new Date(`${item.date}T${item.startTime}:00`) >= now)
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
}

export function activeNotices(records, resident) {
  return records.filter((item) => item.status === 'ATIVO' && (item.destination === 'Todo condomínio' || item.tower === resident.tower))
}

export function basicValidation(values, units = []) {
  if (values.cpf && !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(values.cpf.trim())) return 'Informe um CPF com 11 dígitos.'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'Informe um e-mail válido.'
  if (values.phone && (!/^[\d\s()+-]+$/.test(values.phone) || !/^\d{10,11}$/.test(values.phone.replace(/\D/g, '')))) return 'Informe um telefone com DDD e 10 ou 11 dígitos.'
  if (values.unit && !units.some((unit) => unit.tower === values.tower && unit.number === values.unit.trim())) return 'Selecione uma unidade existente nesta Torre / Bloco.'
  return ''
}

export function noticePeriodError(values) {
  return values.startDate && values.endDate && values.endDate < values.startDate ? 'A data final não pode ser anterior à data inicial.' : ''
}

export function unitDuplicate(records, values, id) {
  return records.some((item) => item.id !== id && normalize(item.tower).trim() === normalize(values.tower).trim() && normalize(item.number).trim() === normalize(values.number).trim())
}

export function unitEditPatch(original, form) {
  const { owner, resident, ...rest } = form
  const replaceFirst = (items = [], value) => [...new Set([...(value?.trim() ? [value.trim()] : []), ...items.slice(1)])]
  return { ...rest, owners: replaceFirst(original.owners, owner), residents: replaceFirst(original.residents, resident) }
}
