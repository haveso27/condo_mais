import { statusLabel } from '../services/serviceUtils'

const labels = {
  id: 'Identificação', name: 'Nome', cpf: 'CPF', phone: 'Telefone', email: 'E-mail',
  tower: 'Torre / Bloco', unit: 'Unidade', number: 'Número', resident: 'Morador',
  residents: 'Moradores vinculados', owners: 'Proprietários vinculados', relation: 'Vínculo',
  startDate: 'Data de início', startTime: 'Horário de início', endDate: 'Data de término', endTime: 'Horário de término',
  date: 'Data', time: 'Horário', notes: 'Observação', status: 'Status', source: 'Origem',
  entryAt: 'Entrada registrada em', exitAt: 'Saída registrada em', company: 'Empresa', service: 'Serviço',
  location: 'Local', receivedAt: 'Recebida em', withdrawnAt: 'Retirada em', doorman: 'Porteiro', code: 'Código', closedAt: 'Encerrado em', provider: 'Prestador / responsável externo', providerContact: 'Contato do prestador', forecast: 'Previsão de atendimento', withdrawnBy: 'Entregue por',
  area: 'Área comum', requestedByOwner: 'Solicitação feita por proprietário', isOwner: 'É proprietário',
  pickedUpBy: 'Retirada por', informedUnit: 'Apartamento informado na retirada', fee: 'Taxa', paymentInstructions: 'Como pagar', paidBy: 'Pagamento confirmado por', authorized: 'Autorização prévia', title: 'Título', content: 'Conteúdo', ticketSummary: 'Chamado relacionado', priority: 'Prioridade',
  destination: 'Destino', description: 'Descrição', category: 'Categoria', openedAt: 'Aberto em',
  type: 'Operação', reference: 'Referência', user: 'Registrado por', timestamp: 'Data e hora do evento', author: 'Publicado por', approvedBy: 'Aprovada / recusada por', doormanIn: 'Entrada registrada por', bookable: 'Moradores podem reservar', requiresApproval: 'Exige aprovação', capacity: 'Capacidade (pessoas)', rules: 'Regras de uso', doormanOut: 'Saída registrada por', role: 'Perfil', pendingFirstAccess: 'Primeiro acesso pendente',
}

// Allowlist de apresentação dos mocks atuais, não um DTO definitivo.
export const detailFields = {
  visitors: ['id', 'name', 'cpf', 'phone', 'tower', 'unit', 'resident', 'startDate', 'startTime', 'endDate', 'endTime', 'status', 'source', 'entryAt', 'doormanIn', 'exitAt', 'doormanOut', 'notes'],
  providers: ['id', 'name', 'cpf', 'company', 'service', 'tower', 'location', 'date', 'time', 'status', 'entryAt', 'exitAt', 'notes'],
  packages: ['code', 'resident', 'tower', 'unit', 'receivedAt', 'doorman', 'status', 'withdrawnAt', 'withdrawnBy', 'pickedUpBy', 'informedUnit', 'notes'],
  reservations: ['id', 'area', 'resident', 'tower', 'unit', 'date', 'startTime', 'endDate', 'endTime', 'status', 'requestedByOwner', 'approvedBy', 'fee', 'paymentInstructions', 'paidBy', 'notes'],
  tickets: ['id', 'code', 'title', 'description', 'category', 'location', 'resident', 'priority', 'status', 'openedAt', 'closedAt', 'provider', 'providerContact', 'forecast', 'notes'],
  notices: ['id', 'title', 'content', 'ticketSummary', 'priority', 'destination', 'tower', 'startDate', 'endDate', 'author', 'status'],
  residents: ['id', 'name', 'cpf', 'email', 'phone', 'tower', 'unit', 'relation', 'isOwner', 'status'],
  staff: ['name', 'cpf', 'role', 'email', 'phone', 'status', 'pendingFirstAccess'],
  units: ['id', 'number', 'tower', 'status', 'owners', 'residents'],
  areas: ['id', 'name', 'description', 'rules', 'bookable', 'requiresApproval', 'capacity', 'status'],
  history: ['id', 'timestamp', 'date', 'time', 'type', 'reference', 'unit', 'user'],
}
// Id da API (UUID) não diz nada a quem lê: os detalhes mostram título, código ou nome no lugar
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(value || ''))
const scalar = (value) => ['string', 'number'].includes(typeof value) ? String(value) : ''
function displayValue(key, value) {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean).join(', ') || 'Nenhum vínculo'
  if (['status', 'priority', 'relation', 'source', 'role'].includes(key)) return statusLabel(scalar(value)) || '—'
  return scalar(value) || '—'
}

export default function RecordDetails({ record, collection }) {
  if (!record) return null
  return <>
    <div className="record-details">{(detailFields[collection] || Object.keys(labels)).filter((key) => Object.hasOwn(record, key) && !(key === 'id' && isUuid(record.id))).map((key) => <div key={key}><small>{labels[key]}</small><strong>{displayValue(key, record[key])}</strong></div>)}</div>
    {Array.isArray(record.history) && <section className="comment-box" aria-label="Histórico"><h3>Histórico</h3>{record.history.length ? record.history.map((item, index) => <article key={index}><p><strong>{scalar(item.action)}</strong>{scalar(item.comment) && ` · ${scalar(item.comment)}`}</p><small>{[scalar(item.author), scalar(item.createdAt)].filter(Boolean).join(' · ')}</small></article>) : <p>Nenhum registro no histórico.</p>}</section>}
    {Array.isArray(record.comments) && <section className="comment-box" aria-label="Comentários"><h3>Comentários</h3>{record.comments.length ? record.comments.map((comment, index) => <article key={index}><p>{typeof comment === 'string' ? comment : scalar(comment?.content)}</p>{comment && typeof comment === 'object' && scalar(comment.author) && <small>{scalar(comment.author)}</small>}{comment && typeof comment === 'object' && scalar(comment.createdAt) && <small> · {scalar(comment.createdAt)}</small>}</article>) : <p>Nenhum comentário registrado.</p>}</section>}
  </>
}
