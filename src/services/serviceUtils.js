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

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function nowLabel() {
  return `Hoje · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function statusLabel(value = '') {
  return value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}
