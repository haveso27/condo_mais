import { statusLabel } from '../services/serviceUtils'

const labels = {
  id: 'Identificação', name: 'Nome', cpf: 'CPF', phone: 'Telefone', email: 'E-mail',
  tower: 'Torre / Bloco', unit: 'Unidade', number: 'Número', resident: 'Morador',
  residents: 'Moradores vinculados', owners: 'Proprietários vinculados', relation: 'Vínculo',
  startDate: 'Data de início', startTime: 'Horário de início', endDate: 'Data de término', endTime: 'Horário de término',
  date: 'Data', time: 'Horário', notes: 'Observação', status: 'Status', source: 'Origem',
  entryAt: 'Entrada registrada em', exitAt: 'Saída registrada em', company: 'Empresa', service: 'Serviço',
  location: 'Local', receivedAt: 'Recebida em', withdrawnAt: 'Retirada em', doorman: 'Porteiro',
  area: 'Área comum', requestedByOwner: 'Solicitação feita por proprietário', isOwner: 'É proprietário',
  authorized: 'Autorização prévia', title: 'Título', content: 'Conteúdo', priority: 'Prioridade',
  destination: 'Destino', description: 'Descrição', category: 'Categoria', openedAt: 'Aberto em',
  type: 'Operação', reference: 'Referência', user: 'Registrado por', timestamp: 'Data e hora do evento',
}

// Allowlist de apresentação dos mocks atuais, não um DTO definitivo.
export const detailFields = {
  visitors: ['id', 'name', 'cpf', 'phone', 'tower', 'unit', 'resident', 'startDate', 'startTime', 'endDate', 'endTime', 'status', 'source', 'entryAt', 'exitAt', 'notes'],
  providers: ['id', 'name', 'cpf', 'company', 'service', 'tower', 'location', 'date', 'time', 'status', 'entryAt', 'exitAt', 'notes'],
  packages: ['id', 'resident', 'tower', 'unit', 'receivedAt', 'doorman', 'status', 'withdrawnAt', 'notes'],
  reservations: ['id', 'area', 'resident', 'tower', 'unit', 'date', 'startTime', 'endTime', 'status', 'requestedByOwner', 'notes'],
  tickets: ['id', 'title', 'description', 'category', 'location', 'resident', 'tower', 'unit', 'priority', 'status', 'openedAt', 'notes'],
  notices: ['id', 'title', 'content', 'priority', 'destination', 'tower', 'startDate', 'endDate', 'status'],
  residents: ['id', 'name', 'cpf', 'email', 'phone', 'tower', 'unit', 'relation', 'isOwner', 'status'],
  units: ['id', 'number', 'tower', 'status', 'owners', 'residents'],
  history: ['id', 'timestamp', 'date', 'time', 'type', 'reference', 'unit', 'user'],
}
const scalar = (value) => ['string', 'number'].includes(typeof value) ? String(value) : ''
function displayValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean).join(', ') || 'Nenhum vínculo'
  if (['status', 'priority', 'relation', 'source'].includes(key)) return statusLabel(scalar(value)) || '—'
  return scalar(value) || '—'
}

export default function RecordDetails({ record, collection }) {
  if (!record) return null
  return <>
    <div className="record-details">{(detailFields[collection] || Object.keys(labels)).filter((key) => Object.hasOwn(record, key)).map((key) => <div key={key}><small>{labels[key]}</small><strong>{displayValue(key, record[key])}</strong></div>)}</div>
    {Array.isArray(record.comments) && <section className="comment-box" aria-label="Comentários"><h3>Comentários</h3>{record.comments.length ? record.comments.map((comment, index) => <article key={index}><p>{typeof comment === 'string' ? comment : scalar(comment?.content)}</p>{comment && typeof comment === 'object' && scalar(comment.author) && <small>{scalar(comment.author)}</small>}{comment && typeof comment === 'object' && scalar(comment.createdAt) && <small> · {scalar(comment.createdAt)}</small>}</article>) : <p>Nenhum comentário registrado.</p>}</section>}
  </>
}
