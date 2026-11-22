// Balcão da portaria: régua das visitas do dia, prateleira de encomendas, quem está dentro e a busca única.
import { normalize, todayIso } from '../../services/serviceUtils.js'
import { visitorEffectiveStatus } from '../../services/visitantesService.js'

const DAY = 24 * 60
const toMinutes = (time) => {
  const [hours, minutes] = String(time || '').split(':').map(Number)
  return Number.isFinite(hours) ? Math.min(DAY, Math.max(0, hours * 60 + (Number.isFinite(minutes) ? minutes : 0))) : null
}
const clock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
const lastTime = (label) => (String(label || '').match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/) || [])[1] || ''
export const unitShort = (record) => [record.tower, record.unit].filter(Boolean).join(', ') || 'área comum'

const KINDS = { ENTROU: 'dentro', AUTORIZADO: 'janela', PENDENTE: 'pendente', SAIU: 'saiu', EXPIRADO: 'expirada' }

// Visitas cuja janela passa por hoje, com a posição de cada barra numa régua de horas
export function visitsTimeline(visitors = [], now = new Date()) {
  const today = todayIso(now)
  const rows = visitors
    .filter((item) => item.startDate && item.startDate <= today && (item.endDate || item.startDate) >= today)
    .map((item) => ({ item, status: visitorEffectiveStatus(item, now) }))
    .filter(({ status }) => KINDS[status])
    .map(({ item, status }) => {
      const start = item.startDate < today ? 0 : toMinutes(item.startTime) ?? 0
      let end = (item.endDate || item.startDate) > today ? DAY : toMinutes(item.endTime) ?? DAY
      if (end <= start) end = Math.min(DAY, start + 30)
      return { id: item.id, record: item, name: item.name, detail: `Visita para ${unitShort(item)}`, status, kind: KINDS[status], start, end }
    })
    .sort((a, b) => a.start - b.start || a.name.localeCompare(b.name, 'pt-BR'))
  const minute = now.getHours() * 60 + now.getMinutes()
  const from = Math.max(0, Math.floor(Math.min(7 * 60, ...rows.map((row) => row.start)) / 120) * 120)
  const to = Math.min(DAY, Math.ceil(Math.max(23 * 60, ...rows.map((row) => row.end)) / 120) * 120)
  const span = to - from || DAY
  const position = (value) => ((Math.min(to, Math.max(from, value)) - from) / span) * 100
  const hours = []
  for (let value = from + 60; value < to; value += 120) hours.push({ label: `${value / 60}h`, left: position(value) })
  return {
    from, to, hours,
    now: minute >= from && minute <= to ? { left: position(minute), label: clock(minute) } : null,
    rows: rows.map((row) => {
      const exitTime = lastTime(row.record.exitAt)
      const entryTime = lastTime(row.record.entryAt)
      const label = row.kind === 'dentro' ? `Dentro${entryTime ? `, ${entryTime}` : ''}` : row.kind === 'janela' ? 'Autorizada' : row.kind === 'saiu' ? `Saiu${exitTime ? ` ${exitTime}` : ''}` : ''
      const outside = row.kind === 'pendente' ? 'Aguardando o morador' : row.kind === 'expirada' ? 'Expirada' : ''
      return { ...row, left: position(row.start), width: Math.max(position(row.end) - position(row.start), 1.5), label, outside, window: `${clock(row.start)} às ${row.end >= DAY ? '24:00' : clock(row.end)}` }
    }),
  }
}

// Prateleira: encomendas aguardando retirada, pela placa da unidade (como o porteiro procura)
export function packagesOnShelf(packages = []) {
  return packages.filter((item) => item.status === 'AGUARDANDO_RETIRADA')
}

// Quem está no condomínio agora (visitantes e prestadores que entraram e ainda não saíram)
export function insideNow(data) {
  const visitors = (data.visitors || []).filter((item) => item.status === 'ENTROU').map((item) => ({ id: item.id, kind: 'visitor', label: `${item.name}, ${unitShort(item)}` }))
  const providers = (data.providers || []).filter((item) => item.status === 'ENTROU').map((item) => ({ id: item.id, kind: 'provider', label: `${item.name}, ${[item.location, item.tower].filter(Boolean).join(', ')}` }))
  return [...visitors, ...providers]
}

// Busca única do balcão: nome, CPF, unidade ou código da encomenda
export function balcaoSearch(data, query, now = new Date(), limit = 8) {
  const text = normalize(query).trim()
  if (!text) return []
  const digits = String(query).replace(/\D/g, '')
  const has = (value) => normalize(String(value || '')).includes(text)
  const cpfMatch = (cpf) => digits.length >= 3 && String(cpf || '').replace(/\D/g, '').includes(digits)
  const unitMatch = (record) => has(record.unit) || has(`${record.tower} ${record.unit}`) || has(`${record.unit} ${record.tower}`)
  const visitors = (data.visitors || []).filter((item) => has(item.name) || cpfMatch(item.cpf) || unitMatch(item)).map((item) => ({
    kind: 'visitor', id: item.id, title: item.name, subtitle: `Visita para ${unitShort(item)} · ${item.startDate}${item.startTime ? ` às ${item.startTime}` : ''}`,
    status: visitorEffectiveStatus(item, now), to: '/portaria/visitantes',
  }))
  const packages = (data.packages || []).filter((item) => has(item.code) || has(item.resident) || unitMatch(item)).map((item) => ({
    kind: 'package', id: item.id, title: item.code || 'Encomenda', subtitle: `${item.noRecipient ? 'Sem destinatário' : [item.resident, unitShort(item)].filter(Boolean).join(' · ')} · ${item.receivedAt || ''}`,
    status: item.status, to: '/portaria/encomendas',
  }))
  // Primeiro o que ainda pede ação no balcão (aguardando retirada, autorizado, pendente, presente)
  const urgency = { AGUARDANDO_RETIRADA: 0, PENDENTE: 0, AUTORIZADO: 1, ENTROU: 1 }
  return [...packages, ...visitors].sort((a, b) => (urgency[a.status] ?? 2) - (urgency[b.status] ?? 2)).slice(0, limit)
}
